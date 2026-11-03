#!/usr/bin/env python3
"""Cloud capture adapter. No production restore, scheduler or Drive token handling."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import ssl

import rtaf_backup as backup

# Session pooler host confirmed by the owner in the project Connect panel.
PROJECT_SESSION_HOST = "aws-1-eu-central-1.pooler.supabase.com"
PROJECT_CA_DER_SHA256 = "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa"


def project_ca(path=None):
    path = Path(path) if path else Path(__file__).parent / "certificates/supabase-prod-ca-2021.crt"
    try:
        der = ssl.PEM_cert_to_DER_cert(path.read_text())
    except (OSError, ValueError, UnicodeError):
        raise backup.BackupError("Certificato CA Supabase assente o non valido.") from None
    if hashlib.sha256(der).hexdigest() != PROJECT_CA_DER_SHA256:
        raise backup.BackupError("Il certificato CA Supabase non coincide con l'impronta verificata.")
    return str(path.resolve())


def verify_pooler_tls():
    # PostgreSQL STARTTLS only: no database startup, password or SQL is sent.
    env = {k: v for k, v in os.environ.items() if not k.startswith(("RTAF_", "PG"))}
    args = ["openssl", "s_client", "-starttls", "postgres", "-connect", PROJECT_SESSION_HOST + ":5432",
            "-servername", PROJECT_SESSION_HOST, "-verify_hostname", PROJECT_SESSION_HOST,
            "-CAfile", project_ca(), "-verify_return_error", "-brief"]
    try:
        result = backup.subprocess.run(args, env=env, input=b"", capture_output=True, timeout=30)
    except (OSError, backup.subprocess.TimeoutExpired):
        raise backup.BackupError("Verifica pubblica TLS non completata; nessuna credenziale inviata.") from None
    if result.returncode:
        raise backup.BackupError("Verifica pubblica TLS fallita; nessuna credenziale inviata.")
    return {"pooler_tls_verified": True, "database_authenticated": False,
            "ca_der_sha256": PROJECT_CA_DER_SHA256}


def cloud_capture(output_dir, env=os.environ, *, capture=backup.capture):
    config = {key: value for key, value in env.items() if value}
    config.setdefault("RTAF_DB_HOST", PROJECT_SESSION_HOST)
    config.setdefault("RTAF_DB_CA", project_ca())
    if config.get("RTAF_BACKUP_FINGERPRINT"):
        config["RTAF_BACKUP_FINGERPRINT"] = config["RTAF_BACKUP_FINGERPRINT"].strip().upper()
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
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tls-probe", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(verify_pooler_tls() if args.tls_probe else cloud_capture("backup-output")))
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error) if isinstance(error, backup.BackupError)
                          else "Copia non completata; nessun dettaglio riservato viene registrato."}), file=sys.stderr)
        sys.exit(1)
