#!/usr/bin/env python3
"""Generate a password-protected recovery bundle in an ephemeral cloud runner.

Only ciphertext, a public key and its fingerprint leave the temporary directory.
No production database or Storage access occurs in this program.
"""
import argparse
import json
import os
from pathlib import Path
import secrets
import shutil
import subprocess
import sys
import tempfile

from rtaf_backup import BackupError, digest, encrypt_archive


def validate_passphrase(passphrase):
    if len(passphrase) < 32 or any(c in passphrase for c in "\r\n\0"):
        raise BackupError("Serve una passphrase casuale di almeno 32 caratteri, su una sola riga.")


def gpg(home, args, passphrase=None):
    env = {k: v for k, v in os.environ.items() if not k.startswith(("RTAF_", "PG"))}
    cmd = ["gpg", "--homedir", str(home), "--batch", "--no-tty"]
    if passphrase is not None:
        cmd += ["--pinentry-mode", "loopback", "--passphrase-fd", "0"]
    try:
        result = subprocess.run(cmd + args, env=env, input=None if passphrase is None
                                else (passphrase + "\n").encode(), capture_output=True, timeout=120)
    except (OSError, subprocess.TimeoutExpired):
        raise BackupError("GnuPG non disponibile o tempo di esecuzione superato.") from None
    if result.returncode:
        raise BackupError("Operazione GnuPG non riuscita; nessun dettaglio riservato viene registrato.")
    return result.stdout


def make_bundle(output_dir, passphrase):
    validate_passphrase(passphrase)
    output = Path(output_dir)
    if output.exists():
        raise BackupError("La destinazione esiste già: nessuna chiave sarà sovrascritta.")
    if not shutil.which("gpg") or not shutil.which("gpgconf"):
        raise BackupError("GnuPG non disponibile.")
    homes = []
    with tempfile.TemporaryDirectory(prefix="rtaf-key-setup-") as temporary:
        work = Path(temporary)
        package = work / "package"; package.mkdir(mode=0o700)
        primary = work / "primary"; primary.mkdir(mode=0o700); homes.append(primary)
        recovered = work / "recovered"; recovered.mkdir(mode=0o700); homes.append(recovered)
        try:
            gpg(primary, ["--quick-generate-key", "Rent to a Friend backup <rent.to.a.friend@gmail.com>",
                          "rsa3072", "encr", "3y"], passphrase)
            listing = gpg(primary, ["--with-colons", "--list-keys"]).decode()
            fingerprint = next(line.split(":")[9] for line in listing.splitlines() if line.startswith("fpr:"))
            public = package / "PUBLIC_KEY.asc"
            public.write_bytes(gpg(primary, ["--armor", "--export", fingerprint]))
            if (not public.read_bytes().startswith(b"-----BEGIN PGP PUBLIC KEY BLOCK-----")
                    or b"PRIVATE KEY" in public.read_bytes()):
                raise BackupError("Esportazione pubblica non valida.")
            private = work / "private.asc"
            gpg(primary, ["--armor", "--output", str(private), "--export-secret-keys", fingerprint], passphrase)
            if not private.read_bytes().startswith(b"-----BEGIN PGP PRIVATE KEY BLOCK-----"):
                raise BackupError("Esportazione della chiave di recupero non valida.")
            wrapped = package / "PRIVATE_RECOVERY_KEY.asc.gpg"
            gpg(primary, ["--armor", "--no-symkey-cache", "--cipher-algo", "AES256", "--s2k-mode", "3",
                          "--output", str(wrapped), "--symmetric", str(private)], passphrase)

            # Recover the exported file in a fresh keyring. The live agent's key
            # cannot satisfy this check: only the bundle and passphrase can.
            restored = work / "restored-private.asc"
            gpg(recovered, ["--no-symkey-cache", "--output", str(restored), "--decrypt", str(wrapped)], passphrase)
            if digest(private) != digest(restored):
                raise BackupError("La chiave esportata non supera la verifica di recupero.")
            gpg(recovered, ["--import", str(restored)], passphrase)
            fixture = work / "fixture.txt"; fixture.write_bytes(b"RTAF recovery test - synthetic data only\n")
            encrypted = work / "fixture.gpg"
            encrypt_archive(fixture, public, fingerprint, encrypted)
            decrypted = work / "decrypted.txt"
            gpg(recovered, ["--output", str(decrypted), "--decrypt", str(encrypted)], passphrase)
            if digest(fixture) != digest(decrypted):
                raise BackupError("La chiave recuperata non decifra il file di prova.")
            # A separate fresh keyring has no cached passphrase.
            wrong = work / "wrong"; wrong.mkdir(mode=0o700); homes.append(wrong)
            try:
                gpg(wrong, ["--no-symkey-cache", "--output", str(work / "must-not-open.asc"),
                            "--decrypt", str(wrapped)], secrets.token_urlsafe(48))
            except BackupError:
                pass
            else:
                raise BackupError("Il file di recupero si apre con una passphrase errata.")
            (package / "FINGERPRINT.txt").write_text(fingerprint + "\n")
            (package / "READ_ME.txt").write_text(
                "CONSERVARE PRIVATE_RECOVERY_KEY.asc.gpg e la passphrase separatamente.\n"
                "Sono indispensabili per ripristinare i backup cifrati per questa chiave.\n"
                "PUBLIC_KEY.asc e FINGERPRINT.txt sono pubblici e vanno nei segreti GitHub\n"
                "RTAF_BACKUP_PUBLIC_KEY_ASC e RTAF_BACKUP_FINGERPRINT.\n"
                "Dopo avere salvato e verificato il pacchetto, eliminare il segreto temporaneo\n"
                "RTAF_RECOVERY_PASSPHRASE da GitHub e cancellare l'artifact di generazione.\n"
                "Questo test verifica le chiavi con dati fittizi, non ripristina il database.\n")
            files = sorted(package.iterdir())
            (package / "SHA256SUMS").write_text("".join(f"{digest(p)}  {p.name}\n" for p in files))
            # Publish only after recovery verification passes. These are the only
            # files the workflow uploads; raw private keys never enter artifacts.
            shutil.copytree(package, output)
            for path in output.iterdir(): path.chmod(0o600)
            return {"key_bundle_created": True, "fingerprint": fingerprint,
                    "key_recovery_verified_with_fixture": True, "database_restore_verified": False}
        finally:
            for home in homes:
                subprocess.run(["gpgconf", "--homedir", str(home), "--kill", "all"],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.self_test:
            with tempfile.TemporaryDirectory(prefix="rtaf-key-test-") as temporary:
                result = make_bundle(Path(temporary) / "fixture", secrets.token_urlsafe(48))
                print(json.dumps({"synthetic_key_roundtrip_verified": result["key_recovery_verified_with_fixture"],
                                  "production_key_created": False}))
        else:
            passphrase = os.environ.pop("RTAF_RECOVERY_PASSPHRASE", "")
            print(json.dumps(make_bundle("recovery-output", passphrase)))
        return 0
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error) if isinstance(error, BackupError)
                          else "Generazione non completata; nessun dettaglio riservato viene registrato."}), file=sys.stderr)
        return 1


if __name__ == "__main__": sys.exit(main())
