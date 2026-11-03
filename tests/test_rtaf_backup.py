"""Offline safety tests; fixtures are never production backups."""
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("backup", Path(__file__).parents[1] / "scripts/rtaf_backup.py")
b = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(b)


def payload(root):
    (root / "database.dump").write_bytes(b"FIXTURE ONLY: not a PostgreSQL backup")
    (root / "roles.sql").write_text("-- FIXTURE ONLY\n")


class FakeStorage:
    def __init__(self):
        self.calls = []

    def listing(self, bucket, prefix, offset):
        self.calls.append((bucket, prefix, offset))
        rows = [{"name": "folder", "id": None}] if prefix == "" else [
            {"name": "a.jpg", "id": "a", "metadata": {"size": 4}},
            {"name": "b.jpg", "id": "b", "metadata": {"size": 4}}]
        return rows[offset:offset + 1]  # Provider returns less than requested.

    def download(self, bucket, name):
        return b"\xff\xd8ok"


class BackupTests(unittest.TestCase):
    def test_storage_auth_supports_modern_keys_and_legacy_jwts(self):
        for secret, bearer in (("sb_secret_fixture_only", None),
                               ("fixture.legacy.jwt", "Bearer fixture.legacy.jwt")):
            with self.subTest(kind="modern" if bearer is None else "legacy"):
                storage = b.Storage(secret)
                from unittest.mock import MagicMock
                response = MagicMock()
                response.__enter__.return_value.read.return_value = b"[]"
                storage.opener = MagicMock()
                storage.opener.open.return_value = response
                self.assertEqual(storage.listing("handoff-photos", "", 0), [])
                request = storage.opener.open.call_args.args[0]
                self.assertEqual(request.get_header("Apikey"), secret)
                self.assertEqual(request.get_header("Authorization"), bearer)

    def test_preflight_never_includes_secret_values(self):
        result = b.preflight({"RTAF_DB_PASSWORD": "fixture-secret"})
        self.assertFalse(result["backup_created"])
        self.assertNotIn("fixture-secret", json.dumps(result))

    def test_database_target_tls_and_secret_isolation(self):
        result = b.database_env({"RTAF_DB_PASSWORD": "fixture-db", "RTAF_STORAGE_SECRET": "fixture-storage",
                                 "PGSSLMODE": "disable", "PGSERVICE": "wrong"})
        self.assertEqual(result["PGSSLMODE"], "verify-full")
        self.assertEqual(result["PGHOST"], f"db.{b.PROJECT}.supabase.co")
        self.assertNotIn("PGSERVICE", result)
        self.assertNotIn("RTAF_STORAGE_SECRET", result)
        for host in ("evil.example", "aws-0-us-east-1.pooler.supabase.com"):
            with self.assertRaises(b.BackupError):
                b.database_env({"RTAF_DB_PASSWORD": "x", "RTAF_DB_HOST": host})

    def test_paginated_private_storage(self):
        storage = FakeStorage()
        rows = b.inventory(storage)
        self.assertEqual(len(rows), 6)
        self.assertEqual({r["bucket"] for r in rows}, set(b.BUCKETS))
        self.assertIn(("handoff-photos", "folder/", 2), storage.calls)

    def test_paths_rejected(self):
        for name in ("../x", "/x", "a//b", "a/./b", "a\\b", ""):
            with self.subTest(name=name), self.assertRaises(b.BackupError):
                b.safe_relative(name)

    def test_inventory_rejects_invalid_size(self):
        fake = FakeStorage()
        fake.listing = lambda *args: [{"name": "x", "id": "id", "metadata": {"size": True}}]
        with self.assertRaises(b.BackupError):
            b.inventory(fake)

    def test_archive_integrity_and_tampering(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); work = root / "payload"; work.mkdir(); payload(work)
            bundle = root / "good.tar.gz"
            b.pack(work, bundle, {"format": 1, "project": b.PROJECT})
            self.assertFalse(b.verify_archive(bundle)["database_restore_verified"])
            with tarfile.open(bundle) as src, tarfile.open(root / "bad.tar.gz", "w:gz") as dst:
                for item in src.getmembers():
                    data = src.extractfile(item).read()
                    if item.name == "roles.sql": data = b"x" * len(data)
                    dst.addfile(item, io.BytesIO(data))
            with self.assertRaises(b.BackupError): b.verify_archive(root / "bad.tar.gz")

    def test_archive_rejects_traversal_and_symlinks(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name, kind in (("../escape", tarfile.REGTYPE), ("link", tarfile.SYMTYPE)):
                with tarfile.open(root / "bad.tar.gz", "w:gz") as tar:
                    item = tarfile.TarInfo(name); item.type = kind; tar.addfile(item)
                with self.assertRaises(b.BackupError): b.verify_archive(root / "bad.tar.gz")

    def test_dump_commands_do_not_pass_password_in_arguments(self):
        calls = []
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            def run(args, **kwargs):
                calls.append(args)
                if "--version" in args: return b"PostgreSQL 17.11"
                if args[0] == "pg_dumpall": (root / "roles.sql").write_text("-- roles")
                if "--list" in args:
                    return "\n".join(f"1; 1 1 TABLE DATA {s} {t} postgres" for s, t in b.REQUIRED_DATA).encode()
                return b""
            with patch.object(b, "run", run): b.dump_database(root, {"RTAF_DB_PASSWORD": "fixture-db-secret"})
        self.assertNotIn("fixture-db-secret", str(calls))

    def test_capture_aborts_on_storage_changes_without_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); key = root / "public.asc"; key.write_text("fixture public key")
            env = {"RTAF_DB_PASSWORD": "fixture", "RTAF_STORAGE_SECRET": "fixture",
                   "RTAF_BACKUP_PUBLIC_KEY": str(key), "RTAF_BACKUP_FINGERPRINT": "A" * 40}
            first = [{"bucket": b.BUCKETS[0], "name": "x.jpg", "size": 4}]
            with patch.object(b, "preflight", return_value={"ready": True}), \
                 patch.object(b, "inventory", side_effect=[first, []]):
                with self.assertRaises(b.BackupError):
                    b.capture(root / "out", env, storage=FakeStorage(), dumper=lambda w, e: payload(w))
            self.assertEqual(list((root / "out").iterdir()), [])

    def test_encryption_failure_removes_partial_output(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); out = root / "partial.gpg"; fingerprint = "B" * 40
            def runner(args):
                if "--list-secret-keys" in args: return b""
                if "--list-keys" in args: return f"pub:::::::::\nfpr:::::::::{fingerprint}:\n".encode()
                if "--encrypt" in args:
                    out.write_bytes(b"partial")
                    raise b.BackupError("fixture failure")
                return b""
            with self.assertRaises(b.BackupError):
                b.encrypt_archive(root / "bundle", root / "public", fingerprint, out, runner=runner)
            self.assertFalse(out.exists())

    def test_private_key_is_refused(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            def runner(args):
                return b"sec:u:" if "--list-secret-keys" in args else b""
            with self.assertRaises(b.BackupError):
                b.encrypt_archive(root / "bundle", root / "public", "B" * 40, root / "out", runner=runner)

    @unittest.skipUnless(shutil.which("gpg"), "GnuPG required")
    def test_real_encryption_decryption_roundtrip_with_disposable_key(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); home = root / "keyring"; home.mkdir(mode=0o700)
            cmd = ["gpg", "--homedir", str(home), "--batch", "--no-tty"]
            def gpg(*args): return b.run(cmd + list(args))
            try:
                # A daemon may inherit stderr. A PIPE would wait for EOF until
                # the agent exits, so use a regular temporary file for the probe.
                with tempfile.TemporaryFile() as log:
                    probe = subprocess.run(["gpg-agent", "--homedir", str(home), "--daemon"],
                                           stdout=subprocess.DEVNULL, stderr=log, timeout=15)
                    log.seek(0)
                    probe_error = log.read()
                if b"Operation not permitted" in probe_error:
                    self.skipTest("Runtime forbids GnuPG agent sockets; real roundtrip NOT verified")
                if probe.returncode:
                    self.fail("GnuPG agent could not start")
                gpg("--pinentry-mode", "loopback", "--passphrase", "", "--quick-generate-key",
                    "RTAF disposable fixture <fixture@example.test>", "rsa2048", "encr", "1d")
                fingerprint = next(line.split(":")[9] for line in gpg("--with-colons", "--list-keys").decode().splitlines() if line.startswith("fpr:"))
                public = root / "public.asc"; public.write_bytes(gpg("--armor", "--export", fingerprint))
                work = root / "payload"; work.mkdir(); payload(work)
                bundle = root / "fixture.tar.gz"; b.pack(work, bundle, {"format": 1, "project": b.PROJECT})
                encrypted = root / "fixture.gpg"
                b.encrypt_archive(bundle, public, fingerprint, encrypted)
                self.assertNotIn(b"FIXTURE ONLY", encrypted.read_bytes())
                restored = root / "restored.tar.gz"
                gpg("--output", str(restored), "--decrypt", str(encrypted))
                self.assertEqual(b.digest(bundle), b.digest(restored))
                self.assertTrue(b.verify_archive(restored)["archive_verified"])
                with self.assertRaises(b.BackupError): b.encrypt_archive(bundle, public, "A" * 40, root / "wrong.gpg")
                self.assertFalse((root / "wrong.gpg").exists())
            finally:
                subprocess.run(["gpgconf", "--homedir", str(home), "--kill", "all"], capture_output=True)


if __name__ == "__main__": unittest.main()
