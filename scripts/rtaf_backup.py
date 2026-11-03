#!/usr/bin/env python3
"""Read-only logical database + app Storage capture. No production restore commands.

Secrets are read from the environment; plaintext is confined to a temporary
directory and never uploaded. A successful capture is NOT a tested restore.
"""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "srjdysdhxnafjrutufmk"
ORIGIN = f"https://{PROJECT}.supabase.co"
DRIVE_FOLDER = "1v6XMqTwAZZQSxwrqyz_XFQCIjcxtYxM9"
BUCKETS = ("listing-photos", "profile-photos", "handoff-photos")
MAX_PHOTO_BYTES = 512000
MAX_OBJECTS = 1500
MAX_BUNDLE_BYTES = 2 * 1024**3
REQUIRED_DATA = (("auth", "users"), ("public", "profiles"),
                 ("public", "listings"), ("public", "bookings"),
                 ("private", "legal_releases"), ("private", "legal_receipts"))


class BackupError(Exception):
    pass


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def run(args, *, env=None, timeout=1800):
    """Do not expose subprocess stderr: providers may include credentials in it."""
    try:
        result = subprocess.run(args, env=env, capture_output=True,
                                timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise BackupError(f"Esecuzione non riuscita: {Path(args[0]).name}.") from None
    if result.returncode:
        raise BackupError(f"Comando non riuscito: {Path(args[0]).name}. Nessuna copia dichiarata completa.")
    return result.stdout


def preflight(env=os.environ):
    required = ("RTAF_DB_PASSWORD", "RTAF_STORAGE_SECRET", "RTAF_BACKUP_PUBLIC_KEY",
                "RTAF_BACKUP_FINGERPRINT")
    missing = [name for name in required if not env.get(name)]
    binaries = [name for name in ("pg_dump", "pg_dumpall", "pg_restore", "gpg")
                if not shutil.which(name)]
    return {"ready": not missing and not binaries, "missing_settings": missing,
            "missing_programs": binaries, "project": PROJECT,
            "drive_folder_id": DRIVE_FOLDER, "backup_created": False}


def database_env(env):
    host = env.get("RTAF_DB_HOST", f"db.{PROJECT}.supabase.co")
    direct = host == f"db.{PROJECT}.supabase.co"
    pooler = re.fullmatch(r"aws-\d+-eu-central-1\.pooler\.supabase\.com", host)
    if not direct and not pooler:
        raise BackupError("Host database estraneo al progetto o alla regione previsti.")
    user = env.get("RTAF_DB_USER", "postgres" if direct else f"postgres.{PROJECT}")
    if user not in ("postgres", f"postgres.{PROJECT}") or (pooler and user != f"postgres.{PROJECT}"):
        raise BackupError("Utente database non coerente con il progetto.")
    # Do not inherit a caller's insecure TLS, service file, or unrelated database.
    result = {k: v for k, v in env.items() if not k.startswith(("PG", "RTAF_"))}
    result.update(PGHOST=host, PGPORT="5432", PGUSER=user, PGDATABASE="postgres",
                  PGPASSWORD=env["RTAF_DB_PASSWORD"], PGSSLMODE="verify-full",
                  PGSSLROOTCERT=env.get("RTAF_DB_CA", "system"), PGCONNECT_TIMEOUT="20",
                  PGAPPNAME="rtaf-read-only-backup")
    return result


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *_args, **_kwargs):
        return None


class Storage:
    def __init__(self, secret):
        self.secret = secret
        self.opener = urllib.request.build_opener(NoRedirect)

    def request(self, path, body=None, limit=2 * 1024**2):
        if not path.startswith("/storage/v1/"):
            raise BackupError("Percorso Storage non consentito.")
        request = urllib.request.Request(ORIGIN + path,
            data=None if body is None else json.dumps(body).encode(),
            headers={"Authorization": "Bearer " + self.secret, "apikey": self.secret,
                     "Content-Type": "application/json"},
            method="GET" if body is None else "POST")
        try:
            with self.opener.open(request, timeout=45) as response:
                data = response.read(limit + 1)
        except (urllib.error.URLError, TimeoutError, OSError):
            raise BackupError("Lettura Storage non riuscita; nessun dettaglio riservato viene registrato.") from None
        if len(data) > limit:
            raise BackupError("Risposta Storage oltre il limite previsto.")
        return data

    def listing(self, bucket, prefix, offset):
        return json.loads(self.request("/storage/v1/object/list/" + bucket,
                         {"prefix": prefix, "limit": 100, "offset": offset,
                          "sortBy": {"column": "name", "order": "asc"}}))

    def download(self, bucket, name):
        return self.request("/storage/v1/object/authenticated/" + bucket + "/" +
                            urllib.parse.quote(name, safe="/"), limit=MAX_PHOTO_BYTES)


def safe_relative(name):
    p = PurePosixPath(name)
    if not name or p.is_absolute() or "\\" in name or any(x in ("", ".", "..") for x in name.split("/")):
        raise BackupError("Nome file non sicuro.")
    return p


def inventory(storage):
    files, visited = [], set()
    for bucket in BUCKETS:
        pending = [""]
        while pending:
            prefix = pending.pop(0)
            if (bucket, prefix) in visited or len(visited) > 5000:
                raise BackupError("Scansione Storage incoerente o troppo grande.")
            visited.add((bucket, prefix))
            offset = 0
            while True:
                rows = storage.listing(bucket, prefix, offset)
                if not isinstance(rows, list) or len(rows) > 100:
                    raise BackupError("Risposta di inventario non valida.")
                if not rows:
                    break
                for row in rows:
                    name = row.get("name")
                    if not isinstance(name, str) or "/" in name:
                        raise BackupError("Voce Storage non valida.")
                    safe_relative(name)
                    full = prefix + name
                    if row.get("id") is None:
                        pending.append(full + "/")
                    else:
                        metadata = row.get("metadata") or {}
                        size = metadata.get("size")
                        if not isinstance(size, int) or isinstance(size, bool) or not 0 < size <= MAX_PHOTO_BYTES:
                            raise BackupError("Dimensioni foto non valide o sconosciute.")
                        files.append({"bucket": bucket, "name": full, "id": row["id"],
                                      "size": size, "updated_at": row.get("updated_at"),
                                      "etag": metadata.get("eTag") or metadata.get("etag")})
                        if len(files) > MAX_OBJECTS:
                            raise BackupError("Superata la quota di foto prevista: verificare prima di continuare.")
                offset += len(rows)  # Also handles a provider cap below 100.
                if offset > 10000:
                    raise BackupError("Limite di paginazione Storage superato.")
    files.sort(key=lambda row: (row["bucket"], row["name"]))
    if len({(x["bucket"], x["name"]) for x in files}) != len(files):
        raise BackupError("Inventario duplicato o instabile.")
    return files


def dump_database(work, env):
    pg_env = database_env(env)
    for binary in ("pg_dump", "pg_dumpall", "pg_restore"):
        version = run([binary, "--version"]).decode()
        if not re.search(r"\b17\.", version):
            raise BackupError("Usare strumenti PostgreSQL 17 compatibili con il progetto.")
    run(["pg_dump", "--no-password", "--format=custom", "--lock-wait-timeout=10000",
         "--file", str(work / "database.dump")], env=pg_env)
    run(["pg_dumpall", "--no-password", "--roles-only", "--no-role-passwords",
         "--file", str(work / "roles.sql")], env=pg_env)
    toc = run(["pg_restore", "--list", str(work / "database.dump")]).decode()
    for schema, table in REQUIRED_DATA:
        if not re.search(r"\bTABLE DATA " + re.escape(schema) + " " + re.escape(table) + r"\b", toc):
            raise BackupError("Il dump non contiene tutte le tabelle indispensabili.")
    if not (work / "roles.sql").stat().st_size:
        raise BackupError("Esportazione dei ruoli vuota.")


def encrypt_archive(archive, public_key, fingerprint, output, *, runner=run):
    if not re.fullmatch(r"[A-Fa-f0-9]{40,64}", fingerprint):
        raise BackupError("Impronta della chiave pubblica non valida.")
    if output.exists():
        raise BackupError("Il file di destinazione esiste già; non sarà sovrascritto.")
    with tempfile.TemporaryDirectory(prefix="rtaf-gpg-") as home:
        os.chmod(home, 0o700)
        common = ["gpg", "--homedir", home, "--batch", "--no-tty"]
        try:
            runner(common + ["--import", str(public_key)])
            if b"sec:" in runner(common + ["--with-colons", "--list-secret-keys"]):
                raise BackupError("La chiave fornita contiene materiale privato.")
            keys = runner(common + ["--with-colons", "--list-keys"]).decode()
            primary = []
            awaiting = False
            for line in keys.splitlines():
                fields = line.split(":")
                if fields[0] == "pub":
                    awaiting = True
                elif fields[0] == "sub":
                    awaiting = False
                elif fields[0] == "fpr" and awaiting:
                    primary.append(fields[9].upper()); awaiting = False
            if primary != [fingerprint.upper()]:
                raise BackupError("La chiave non coincide con l'impronta approvata.")
            runner(common + ["--trust-model", "always", "--recipient", fingerprint,
                              "--output", str(output), "--encrypt", str(archive)])
            if not output.is_file() or not output.stat().st_size:
                raise BackupError("La cifratura non ha prodotto un archivio.")
            os.chmod(output, 0o600)
        except Exception:
            output.unlink(missing_ok=True)
            raise


def pack(work, bundle, manifest):
    paths = sorted(p for p in work.rglob("*") if p.is_file())
    if any(p.is_symlink() for p in work.rglob("*")):
        raise BackupError("Collegamenti simbolici non ammessi nel backup.")
    manifest["files"] = [{"path": p.relative_to(work).as_posix(),
                          "bytes": p.stat().st_size, "sha256": digest(p)} for p in paths]
    (work / "manifest.json").write_text(json.dumps(manifest, indent=2))
    with tarfile.open(bundle, "w:gz") as tar:
        for p in paths + [work / "manifest.json"]:
            tar.add(p, arcname=p.relative_to(work).as_posix(), recursive=False)


def verify_archive(bundle):
    with tarfile.open(bundle, "r:gz") as tar:
        members = tar.getmembers()
        names = [m.name for m in members]
        if len(names) != len(set(names)) or sum(m.size for m in members) > MAX_BUNDLE_BYTES:
            raise BackupError("Archivio duplicato o oltre il limite previsto.")
        for m in members:
            safe_relative(m.name)
            if not m.isfile():
                raise BackupError("L'archivio contiene una voce non regolare.")
        if "manifest.json" not in names:
            raise BackupError("Manifesto assente.")
        info = tar.getmember("manifest.json")
        if info.size > 4 * 1024**2:
            raise BackupError("Manifesto troppo grande.")
        manifest = json.load(tar.extractfile(info))
        if manifest.get("project") != PROJECT or manifest.get("format") != 1:
            raise BackupError("Progetto o formato del backup non corretto.")
        expected = manifest.get("files", [])
        if set(names) != {x["path"] for x in expected} | {"manifest.json"} or len(expected) != len(names) - 1:
            raise BackupError("Il manifesto non copre esattamente l'archivio.")
        for item in expected:
            member = tar.getmember(item["path"])
            data = tar.extractfile(member)
            h = hashlib.sha256()
            for block in iter(lambda: data.read(1024 * 1024), b""):
                h.update(block)
            if member.size != item["bytes"] or h.hexdigest() != item["sha256"]:
                raise BackupError("Integrità del backup non valida.")
        if not {"database.dump", "roles.sql"}.issubset(names):
            raise BackupError("Database o ruoli assenti.")
        return {"archive_verified": True, "project": PROJECT,
                "file_count": len(expected), "database_restore_verified": False}


def capture(output_dir, env=os.environ, *, storage=None, dumper=dump_database):
    check = preflight(env)
    if not check["ready"]:
        raise BackupError("Prerequisiti mancanti. Eseguire prima il comando preflight.")
    public_key = Path(env["RTAF_BACKUP_PUBLIC_KEY"]).resolve(strict=True)
    if b"PRIVATE KEY" in public_key.read_bytes():
        raise BackupError("Fornire soltanto la chiave pubblica, non la chiave privata.")
    output_dir = Path(output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = output_dir / ("rtaf-" + stamp + ".tar.gz.gpg")
    storage = storage or Storage(env["RTAF_STORAGE_SECRET"])
    with tempfile.TemporaryDirectory(prefix="rtaf-plaintext-") as temporary:
        work = Path(temporary) / "payload"; work.mkdir(mode=0o700)
        # Inventory before and after capture: abort if any object changes.
        before = inventory(storage)
        for row in before:
            data = storage.download(row["bucket"], row["name"])
            if len(data) != row["size"] or not data.startswith(b"\xff\xd8"):
                raise BackupError("Foto mancante, danneggiata o non coerente con l'inventario.")
            path = work / "storage" / row["bucket"] / safe_relative(row["name"])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        dumper(work, env)
        if before != inventory(storage):
            raise BackupError("Le foto sono cambiate durante la copia. Ripetere in un momento senza upload.")
        (work / "storage-inventory.json").write_text(json.dumps(before, indent=2))
        bundle = Path(temporary) / "bundle.tar.gz"
        pack(work, bundle, {"format": 1, "project": PROJECT, "created_at": stamp,
                           "storage_buckets": list(BUCKETS), "storage_object_count": len(before),
                           "database_restore_verified": False,
                           "provider_configuration": "Not exported: review Auth/SMTP, functions, cron, API keys and Vault encryption root key separately."})
        verify_archive(bundle)
        encrypt_archive(bundle, public_key, env["RTAF_BACKUP_FINGERPRINT"], output)
    return {"encrypted_archive_created": True, "path": str(output), "sha256": digest(output),
            "storage_objects": len(before), "drive_uploaded": False,
            "database_restore_verified": False, "drive_folder_id": DRIVE_FOLDER}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("preflight")
    create = commands.add_parser("capture"); create.add_argument("--output-dir", required=True)
    verify = commands.add_parser("verify-archive"); verify.add_argument("archive")
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.command == "preflight":
            status = preflight(); print(json.dumps(status)); return 0 if status["ready"] else 2
        if args.command == "capture":
            result = capture(args.output_dir)
        else:
            result = verify_archive(args.archive)
        print(json.dumps(result)); return 0
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error) if isinstance(error, BackupError)
                          else "Backup non completato. Nessun dettaglio riservato viene registrato."}), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
