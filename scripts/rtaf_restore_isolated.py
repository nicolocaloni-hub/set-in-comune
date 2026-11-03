#!/usr/bin/env python3
"""Restore only into a disposable Docker container with networking disabled.

No production connection options are accepted. No plaintext or key is uploaded.
The first real test is pinned to the ciphertext already verified on Drive.
"""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time

from rtaf_backup import BackupError, REQUIRED_DATA, digest, verify_archive, pack, encrypt_archive
from rtaf_recovery_key import gpg, make_bundle, validate_passphrase

IMAGE = "supabase/postgres:17.6.1.136@sha256:f371b5f3f2ac0a05703f33d6e6134515fb2498cab708fb948a0aeb7481467c00"  # Official self-hosting compose, checked 2026-11-03.
ADMIN = "rtaf_restore_operator"
DATABASE = "rtaf_restore"
BACKUP_NAME = "rtaf-20261103T213735479758Z.tar.gz.gpg"
BACKUP_SHA = "6c7a90f99d957c6b6e3efcc8f24755a73ec92dc158fb635f0d7d10bc855a622d"
FINGERPRINT = "C9EFC8DE0028369D0553D1CD10954ABD47A5A737"
IDENT = r'(?:"(?:[^"]|"")+"|[A-Za-z_][A-Za-z_0-9$]*)'
COPY = re.compile(rf'^COPY ({IDENT})\.({IDENT}) \(.*\) FROM stdin;$')


def clean_env():
    return {k: v for k, v in os.environ.items()
            if not k.startswith(("RTAF_", "PG", "SUPABASE_")) and k != "GNUPGHOME"}


def command(args, *, data=None, timeout=180):
    try:
        result = subprocess.run(args, input=data, capture_output=True,
                                env=clean_env(), timeout=timeout)
    except (OSError, subprocess.TimeoutExpired):
        raise BackupError("ISOLATED_PROCESS_TIMEOUT_OR_UNAVAILABLE") from None
    if result.returncode:
        # No raw stderr: database errors can contain private values or SQL.
        message = result.stderr.lower()
        code = next((label for label, marker in (
            ("EXTENSION_UNAVAILABLE", b"extension is not available"),
            ("EXTENSION_PRELOAD", b"shared_preload_libraries"),
            ("ROLE_MISSING", b"does not exist"),
            ("DUPLICATE_OBJECT", b"already exists"),
            ("PERMISSION", b"permission denied")) if marker in message), "PROCESS_FAILURE")
        raise BackupError("ISOLATED_" + code)
    return result.stdout


def identifier(value):
    return '"' + value.replace('"', '""') + '"'


def unquote(value):
    return value[1:-1].replace('""', '"') if value.startswith('"') else value


def copy_counts(sql):
    counts = {}
    current = None
    for line in sql.decode().splitlines():
        if current is not None:
            if line == r"\.":
                current = None
            else:
                counts[current] += 1
        elif line.startswith("COPY "):
            match = COPY.fullmatch(line)
            if not match:
                raise BackupError("UNSUPPORTED_COPY_HEADER")
            current = tuple(unquote(x) for x in match.groups())
            if current in counts:
                raise BackupError("DUPLICATE_COPY_TABLE")
            counts[current] = 0
    if current is not None or not set(REQUIRED_DATA).issubset(counts):
        raise BackupError("INCOMPLETE_DATABASE_DATA")
    return counts


class Database:
    def __init__(self):
        self.name = "rtaf-isolated-" + secrets.token_hex(8)

    def execute(self, args, data=None):
        return command(["docker", "exec", "-i", "--user", "postgres", self.name, *args], data=data)

    def sql(self, sql, db=DATABASE):
        return self.execute(["psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1",
                             "-h", "/tmp", "-U", ADMIN, "-d", db], sql.encode())

    def __enter__(self):
        try:
            command(["docker", "run", "-d", "--name", self.name, "--network", "none",
                     "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
                     "--user", "postgres", "--memory", "2g", "--cpus", "2", "--pids-limit", "128",
                     "--tmpfs", "/tmp:rw,nosuid,size=1073741824,mode=1777",
                     "--entrypoint", "/bin/sh", IMAGE, "-ec",
                     "initdb -D /tmp/rtaf-data -U " + ADMIN + " --auth=trust --encoding=UTF8 --locale=C >/dev/null 2>&1; "
                     "exec postgres -D /tmp/rtaf-data -k /tmp -c listen_addresses='' "
                     "-c shared_buffers=32MB -c max_connections=20 "
                     # Vault is loaded lazily: its production root key is not available here.
                     "-c shared_preload_libraries=pg_cron,pg_stat_statements,pg_net "
                     "-c cron.database_name=" + DATABASE + " -c cron.launch_active_jobs=off "
                     "-c log_statement=none -c log_min_messages=fatal -c log_min_error_statement=panic"])
            for attempt in range(45):
                try:
                    self.sql("SELECT 1", "postgres")
                    break
                except BackupError:
                    if attempt == 44: raise BackupError("ISOLATED_DATABASE_STARTUP_FAILED") from None
                    time.sleep(1)
            state = json.loads(command(["docker", "inspect", self.name]))[0]
            if (state["HostConfig"]["NetworkMode"] != "none" or state["HostConfig"].get("PortBindings")
                    or state["HostConfig"].get("Binds")):
                raise BackupError("ISOLATION_NOT_VERIFIED")
            self.sql("CREATE DATABASE " + DATABASE + " TEMPLATE template0", "postgres")
            return self
        except Exception:
            self.__exit__(None, None, None)
            raise

    def __exit__(self, *args):
        # Also used by the workflow's always() cleanup if interrupted externally.
        subprocess.run(["docker", "rm", "-fv", self.name], env=clean_env(),
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)


def stage(name):
    print(json.dumps({"isolated_restore_phase": name}), flush=True)


def restore(payload):
    roles = (payload / "roles.sql").read_bytes()
    if ADMIN.encode() in roles or re.search(rb"\bPASSWORD\s+(?!NULL\b)", roles, re.I):
        raise BackupError("UNEXPECTED_ROLE_DUMP")
    stage("start_disposable_database")
    with Database() as db:
        # This is a fresh initdb, not an existing Supabase project. Restore all
        # roles/owners/ACLs; do not ignore errors or strip managed schemas.
        stage("restore_roles")
        db.sql(roles.decode(), "postgres")
        db.execute(["sh", "-c", "cat > /tmp/database.dump"], (payload / "database.dump").read_bytes())
        base = ["pg_restore", "--exit-on-error", "-h", "/tmp", "-U", ADMIN,
                "-d", DATABASE, "/tmp/database.dump"]
        stage("restore_full_database")
        db.execute(base)
        sql = db.execute(["pg_restore", "--data-only", "--file=-", "/tmp/database.dump"])
        expected = copy_counts(sql)
        stage("compare_all_table_counts_and_rls")
        for (schema, table), count in expected.items():
            actual = int(db.sql("SELECT count(*) FROM " + identifier(schema) + "." + identifier(table)))
            if actual != count:
                raise BackupError("RESTORED_ROW_COUNT_MISMATCH")
        protected = int(db.sql("SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace "
                               "WHERE n.nspname='public' AND c.relname IN ('profiles','listings','bookings') "
                               "AND c.relrowsecurity"))
        if protected != 3:
            raise BackupError("RESTORED_RLS_MISSING")
        inventory = json.loads((payload / "storage-inventory.json").read_text())
        if inventory:
            # A DB-only test is insufficient to claim photo service recovery.
            photo_status = "inventory_hashes_verified_service_restore_pending"
        else:
            objects = int(db.sql("SELECT count(*) FROM storage.objects WHERE bucket_id IN "
                                 "('listing-photos','profile-photos','handoff-photos')"))
            if objects:
                raise BackupError("EMPTY_PHOTO_INVENTORY_CONTRADICTS_DATABASE")
            photo_status = "no_physical_photos_in_this_snapshot"
        return {"database_restore_verified": True, "all_restored_copy_row_counts_match": True,
                "tables_compared": len(expected), "required_rls_tables_verified": protected,
                "storage_objects_in_archive": len(inventory), "photo_restore": photo_status,
                "target_image": IMAGE, "target_network": "none", "production_modified": False,
                "full_application_recovery_verified": False,
                "configuration_remaining": "Auth/SMTP, API keys, functions, Vault root key and application login are outside this database test"}


def decrypt_and_restore(archive, wrapped, passphrase, fingerprint):
    validate_passphrase(passphrase)
    with tempfile.TemporaryDirectory(prefix="rtaf-restore-") as temporary:
        work = Path(temporary); home = work / "gpg"; home.mkdir(mode=0o700)
        try:
            stage("recover_protected_key_and_decrypt_archive")
            private = work / "private.asc"
            gpg(home, ["--no-symkey-cache", "--output", str(private), "--decrypt", str(wrapped)], passphrase)
            gpg(home, ["--import", str(private)], passphrase)
            private.unlink()
            listing = gpg(home, ["--with-colons", "--list-secret-keys"]).decode()
            fingerprints = [line.split(":")[9] for line in listing.splitlines() if line.startswith("fpr:")]
            if fingerprints != [fingerprint]:
                raise BackupError("RECOVERY_KEY_FINGERPRINT_MISMATCH")
            bundle = work / "bundle.tar.gz"
            gpg(home, ["--output", str(bundle), "--decrypt", str(archive)], passphrase)
            verify_archive(bundle)
            payload = work / "payload"; payload.mkdir(mode=0o700)
            with tarfile.open(bundle, "r:gz") as tar:
                # verify_archive has already rejected nonregular/unsafe members.
                for member in tar.getmembers():
                    target = payload / member.name
                    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                    with tar.extractfile(member) as source, target.open("xb") as output:
                        shutil.copyfileobj(source, output)
            return restore(payload)
        finally:
            subprocess.run(["gpgconf", "--homedir", str(home), "--kill", "all"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)


def fixture():
    with tempfile.TemporaryDirectory(prefix="rtaf-restore-fixture-") as temporary:
        root = Path(temporary); payload = root / "payload"; payload.mkdir()
        with Database() as source:
            source.sql("CREATE ROLE postgres; CREATE SCHEMA auth; CREATE SCHEMA private; CREATE SCHEMA storage; "
                       "CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; "
                       "CREATE EXTENSION pg_cron; CREATE EXTENSION pg_net; CREATE EXTENSION supabase_vault;")
            for schema, table in REQUIRED_DATA:
                source.sql(f'CREATE TABLE {identifier(schema)}.{identifier(table)} (id integer PRIMARY KEY CHECK(id>0)); '
                           f'INSERT INTO {identifier(schema)}.{identifier(table)} VALUES (1); '
                           f'ALTER TABLE {identifier(schema)}.{identifier(table)} ENABLE ROW LEVEL SECURITY;')
            source.sql("CREATE TABLE storage.objects (bucket_id text, name text);")
            (payload / "database.dump").write_bytes(source.execute(
                ["pg_dump", "-h", "/tmp", "-U", ADMIN, "-d", DATABASE, "-Fc", "--no-owner"]))
            # The synthetic dump is owned by the local operator, which exists on
            # both sides. The real test restores the complete captured role file.
            (payload / "roles.sql").write_text("CREATE ROLE postgres;\n")
        (payload / "storage-inventory.json").write_text("[]")
        bundle = root / "bundle.tar.gz"
        pack(payload, bundle, {"format": 1, "project": "srjdysdhxnafjrutufmk"})
        passphrase = secrets.token_urlsafe(48)
        make_bundle(root / "keys", passphrase)
        fingerprint = (root / "keys/FINGERPRINT.txt").read_text().strip()
        encrypted = root / "fixture.gpg"
        encrypt_archive(bundle, root / "keys/PUBLIC_KEY.asc", fingerprint, encrypted)
        result = decrypt_and_restore(encrypted, root / "keys/PRIVATE_RECOVERY_KEY.asc.gpg", passphrase, fingerprint)
        result["synthetic_only"] = True
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.self_test:
            result = fixture()
        else:
            archive = Path("restore-input/backup") / BACKUP_NAME
            if digest(archive) != BACKUP_SHA:
                raise BackupError("CIPHERTEXT_DOES_NOT_MATCH_VERIFIED_DRIVE_COPY")
            passphrase = os.environ.pop("RTAF_RECOVERY_PASSPHRASE", "")
            result = decrypt_and_restore(archive, Path("restore-input/key/PRIVATE_RECOVERY_KEY.asc.gpg"),
                                         passphrase, FINGERPRINT)
            result.update({"synthetic_only": False, "ciphertext_sha256": BACKUP_SHA,
                           "matches_verified_drive_copy": True})
        print(json.dumps(result))
        return 0
    except Exception as error:
        print(json.dumps({"ok": False, "database_restore_verified": False,
                          "error": str(error) if isinstance(error, BackupError) else "ISOLATED_RESTORE_FAILED"}),
              file=sys.stderr)
        return 1


if __name__ == "__main__": sys.exit(main())
