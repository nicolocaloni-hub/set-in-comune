import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts'))
import rtaf_restore_isolated as restore
from rtaf_backup import BackupError, REQUIRED_DATA


def copy_fixture(extra=''):
    return ''.join(f'COPY {schema}.{table} (id) FROM stdin;\n1\n\\.\n'
                   for schema, table in REQUIRED_DATA) + extra


class IsolatedRestoreTests(unittest.TestCase):
    def test_copy_counts_escaped_newlines_nulls_and_quoted_identifiers(self):
        sql = copy_fixture('COPY "other.schema"."table ""quoted""" (x) FROM stdin;\n'
                           r'hello\nworld' + '\n' + r'\N' + '\n\\.\n')
        counts = restore.copy_counts(sql.encode())
        self.assertEqual(counts[('other.schema', 'table "quoted"')], 2)
        self.assertTrue(all(counts[pair] == 1 for pair in REQUIRED_DATA))

    def test_truncated_or_missing_or_duplicate_data_is_rejected(self):
        for sql in ('', copy_fixture()[:-3], copy_fixture() + copy_fixture()):
            with self.subTest(sql=sql[:40]), self.assertRaises(BackupError):
                restore.copy_counts(sql.encode())

    def test_identifiers_cannot_escape_query(self):
        self.assertEqual(restore.identifier('x"; DROP DATABASE postgres;--'),
                         '"x""; DROP DATABASE postgres;--"')

    def test_children_do_not_inherit_production_or_recovery_credentials(self):
        with patch.dict(os.environ, {'RTAF_DB_PASSWORD': 'fixture-password',
                                    'RTAF_RECOVERY_PASSPHRASE': 'fixture-passphrase',
                                    'PGHOST': 'production.example', 'SUPABASE_KEY': 'fixture-key',
                                    'GNUPGHOME': '/wrong/keyring'}):
            env = restore.clean_env()
            self.assertFalse(any(k in env for k in ('RTAF_DB_PASSWORD', 'RTAF_RECOVERY_PASSPHRASE',
                                                    'PGHOST', 'SUPABASE_KEY', 'GNUPGHOME')))

    def test_process_failure_does_not_expose_database_output(self):
        import subprocess
        result = subprocess.CompletedProcess([], 1, b'private row', b'ERROR: private email@example.com')
        with patch.object(restore.subprocess, 'run', return_value=result):
            with self.assertRaisesRegex(BackupError, '^ISOLATED_PROCESS_FAILURE$'):
                restore.command(['fixture'])


if __name__ == '__main__': unittest.main()
