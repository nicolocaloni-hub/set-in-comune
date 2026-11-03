#!/usr/bin/env python3
"""Cloud capture adapter. No production restore, scheduler or Drive token handling."""
import json
import os
from pathlib import Path
import sys
import tempfile

import rtaf_backup as backup


def cloud_capture(output_dir, env=os.environ, *, capture=backup.capture):
    config = {key: value for key, value in env.items() if value}
    required = ("RTAF_DB_PASSWORD", "RTAF_STORAGE_SECRET",
                "RTAF_BACKUP_PUBLIC_KEY_ASC", "RTAF_BACKUP_FINGERPRINT")
    if any(not config.get(name) for name in required):
        raise backup.BackupError("Configurare i quattro segreti richiesti prima della copia reale.")
    key_text = config.pop("RTAF_BACKUP_PUBLIC_KEY_ASC")
    if (not key_text.strip().startswith("-----BEGIN PGP PUBLIC KEY BLOCK-----")
            or "PRIVATE KEY" in key_text):
        raise backup.BackupError("Fornire esclusivamente una chiave pubblica OpenPGP ASCII.")
    with tempfile.TemporaryDirectory(prefix="rtaf-cloud-public-key-") as temporary:
        key = Path(temporary) / "public.asc"
        key.write_text(key_text)
        config["RTAF_BACKUP_PUBLIC_KEY"] = str(key)
        result = capture(output_dir, config)
    # Checksum sidecar covers ciphertext only. No plaintext dumps enter artifacts.
    archive = Path(result["path"])
    if not archive.name.endswith(".tar.gz.gpg") or not archive.is_file():
        raise backup.BackupError("Archivio cifrato non disponibile.")
    checksum = backup.digest(archive)
    (archive.parent / "SHA256SUMS").write_text(f"{checksum}  {archive.name}\n")
    return {"encrypted_archive_created": True, "file": archive.name, "sha256": checksum,
            "drive_uploaded": False, "database_restore_verified": False}


if __name__ == "__main__":
    os.umask(0o077)
    try:
        print(json.dumps(cloud_capture("backup-output")))
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error) if isinstance(error, backup.BackupError)
                          else "Copia non completata; nessun dettaglio riservato viene registrato."}), file=sys.stderr)
        sys.exit(1)
