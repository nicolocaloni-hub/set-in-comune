import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1] / "scripts"))
import rtaf_recovery_key as recovery


class RecoveryKeyTests(unittest.TestCase):
    def test_rejects_weak_or_multiline_password_before_creating_files(self):
        for phrase in ("", "short", "x" * 32 + "\nextra", "x" * 32 + "\0"):
            with self.subTest(phrase_length=len(phrase)), tempfile.TemporaryDirectory() as temp:
                target = Path(temp) / "output"
                with self.assertRaises(recovery.BackupError): recovery.make_bundle(target, phrase)
                self.assertFalse(target.exists())

    def test_existing_bundle_cannot_be_overwritten(self):
        with tempfile.TemporaryDirectory() as temp:
            target = Path(temp); marker = target / "old"; marker.write_text("preserve")
            with self.assertRaises(recovery.BackupError): recovery.make_bundle(target, "x" * 40)
            self.assertEqual(marker.read_text(), "preserve")

    def test_password_goes_only_to_stdin_not_arguments_or_child_environment(self):
        phrase = "fixture-passphrase-used-for-testing-only"
        with patch.dict(recovery.os.environ, {"RTAF_DB_PASSWORD": "fixture-db", "RTAF_RECOVERY_PASSPHRASE": phrase}), \
             patch.object(recovery.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, b"ok", b"")) as mock:
            self.assertEqual(recovery.gpg(Path("/fixture/keyring"), ["--list-keys"], phrase), b"ok")
            args, kwargs = mock.call_args
            self.assertNotIn(phrase, str(args))
            self.assertNotIn("RTAF_RECOVERY_PASSPHRASE", kwargs["env"])
            self.assertNotIn("RTAF_DB_PASSWORD", kwargs["env"])
            self.assertEqual(kwargs["input"], (phrase + "\n").encode())

    def test_process_errors_never_echo_provider_or_key_material(self):
        with patch.object(recovery.subprocess, "run", return_value=subprocess.CompletedProcess([], 2, b"private-fixture", b"sensitive-fixture")):
            with self.assertRaises(recovery.BackupError) as raised:
                recovery.gpg(Path("/fixture/keyring"), ["--list-keys"])
            self.assertNotIn("fixture", str(raised.exception))


if __name__ == "__main__": unittest.main()
