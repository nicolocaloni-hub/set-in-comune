import importlib.util
import os
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
import rtaf_backup as backup
import rtaf_backup_cloud as cloud


class CloudTests(unittest.TestCase):
    def test_missing_settings_fail_before_capture(self):
        def unexpected(*args): self.fail("capture must not start")
        with self.assertRaises(backup.BackupError): cloud.cloud_capture("unused", {}, capture=unexpected)

    def test_private_key_is_refused_before_capture(self):
        env = dict.fromkeys(("RTAF_DB_PASSWORD", "RTAF_STORAGE_SECRET", "RTAF_BACKUP_FINGERPRINT"), "fixture")
        env["RTAF_BACKUP_PUBLIC_KEY_ASC"] = "-----BEGIN PGP PRIVATE KEY BLOCK-----"
        with self.assertRaises(backup.BackupError): cloud.cloud_capture("unused", env)

    def test_public_key_is_temporary_and_checksum_covers_ciphertext(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary); keys = []
            env = {"RTAF_DB_PASSWORD": "fixture-password", "RTAF_STORAGE_SECRET": "fixture-token",
                   "RTAF_BACKUP_PUBLIC_KEY_ASC": "-----BEGIN PGP PUBLIC KEY BLOCK-----\nfixture",
                   "RTAF_BACKUP_FINGERPRINT": "A" * 40, "RTAF_DB_HOST": ""}
            def capture(output_dir, config):
                keys.append(Path(config["RTAF_BACKUP_PUBLIC_KEY"]))
                self.assertTrue(keys[0].exists())
                self.assertNotIn("RTAF_BACKUP_PUBLIC_KEY_ASC", config)
                self.assertNotIn("RTAF_DB_HOST", config)
                archive = Path(output_dir) / "fixture.tar.gz.gpg"
                archive.write_bytes(b"fixture ciphertext only")
                return {"path": str(archive)}
            result = cloud.cloud_capture(root, env, capture=capture)
            self.assertFalse(keys[0].exists())
            self.assertEqual((root / "SHA256SUMS").read_text(), f"{backup.digest(root / result['file'])}  {result['file']}\n")
            self.assertFalse(result["drive_uploaded"])
            self.assertFalse(result["database_restore_verified"])
            self.assertNotIn("fixture-password", str(result))


if __name__ == "__main__": unittest.main()
