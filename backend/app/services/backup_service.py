"""
Automatic database backups.

* SQLite (the default): uses SQLite's own online-backup API, so a copy taken while the app is
  running is always consistent. The copy is gzip-compressed.
* PostgreSQL: runs `pg_dump` when it is installed; otherwise falls back to a portable JSON export.
* Anything else: portable JSON export (every table, every row).

Settings (environment variables):
    LIFEFLOW_BACKUP_DIR          where backups are written              (default ./backups)
    LIFEFLOW_BACKUP_KEEP         how many backups to keep               (default 14)
    LIFEFLOW_BACKUP_EVERY_HOURS  hours between automatic backups        (default 24)
    LIFEFLOW_BACKUP=off          turns automatic backups off
"""
import gzip
import json
import os
import shutil
import sqlite3
import subprocess
import tempfile
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional

from sqlalchemy import text

from app.config import DATABASE_URL
from app.database import engine

BACKUP_PREFIX = "lifeflow-backup-"


def backup_dir() -> str:
    path = os.environ.get("LIFEFLOW_BACKUP_DIR", "./backups")
    os.makedirs(path, exist_ok=True)
    return path


def keep_count() -> int:
    try:
        return max(1, int(os.environ.get("LIFEFLOW_BACKUP_KEEP", "14")))
    except ValueError:
        return 14


def every_hours() -> float:
    try:
        return max(0.1, float(os.environ.get("LIFEFLOW_BACKUP_EVERY_HOURS", "24")))
    except ValueError:
        return 24.0


def backups_enabled() -> bool:
    return os.environ.get("LIFEFLOW_BACKUP", "on").lower() != "off"


def _sqlite_path() -> Optional[str]:
    if not DATABASE_URL.startswith("sqlite"):
        return None
    path = DATABASE_URL.split("///", 1)[-1]
    return path if path and path != ":memory:" else None


def _stamp() -> str:
    return datetime.utcnow().strftime("%Y%m%d-%H%M%S")


def _gzip_file(source: str, target: str) -> None:
    with open(source, "rb") as src, gzip.open(target, "wb") as dst:
        shutil.copyfileobj(src, dst)


def _backup_sqlite(path: str, target_base: str) -> str:
    target = f"{target_base}.sqlite.gz"
    with tempfile.TemporaryDirectory() as tmp:
        copy_path = os.path.join(tmp, "copy.db")
        source = sqlite3.connect(path)
        dest = sqlite3.connect(copy_path)
        try:
            source.backup(dest)
        finally:
            dest.close()
            source.close()
        _gzip_file(copy_path, target)
    return target


def _json_default(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bytes):
        return value.hex()
    return str(value)


def _backup_json(target_base: str) -> str:
    """Portable export of every table. Works on any database SQLAlchemy supports."""
    from app.database import Base
    target = f"{target_base}.json.gz"
    data = {"format": "lifeflow-json-v1", "created_at": datetime.utcnow().isoformat(), "tables": {}}
    with engine.connect() as connection:
        for table in Base.metadata.sorted_tables:
            rows = connection.execute(table.select()).mappings().all()
            data["tables"][table.name] = [dict(row) for row in rows]
    with gzip.open(target, "wt", encoding="utf-8") as handle:
        json.dump(data, handle, default=_json_default)
    return target


def _backup_postgres(target_base: str) -> Optional[str]:
    if not shutil.which("pg_dump"):
        return None
    target = f"{target_base}.sql.gz"
    url = DATABASE_URL.replace("postgresql+psycopg2://", "postgresql://")
    try:
        with gzip.open(target, "wb") as out:
            process = subprocess.run(["pg_dump", "--no-owner", url], stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE, timeout=600)
            if process.returncode != 0:
                raise RuntimeError(process.stderr.decode("utf-8", "ignore")[:300])
            out.write(process.stdout)
        return target
    except Exception:  # noqa: BLE001 -- fall back to the JSON export
        if os.path.exists(target):
            os.remove(target)
        return None


def run_backup() -> dict:
    """Takes one backup now. Returns {name, size_bytes, created_at}."""
    base = os.path.join(backup_dir(), f"{BACKUP_PREFIX}{_stamp()}")
    sqlite_path = _sqlite_path()
    if sqlite_path:
        target = _backup_sqlite(sqlite_path, base)
    elif DATABASE_URL.startswith("postgres"):
        target = _backup_postgres(base) or _backup_json(base)
    else:
        target = _backup_json(base)
    prune_old_backups()
    return _describe(target)


def _describe(path: str) -> dict:
    stat = os.stat(path)
    return {
        "name": os.path.basename(path),
        "size_bytes": stat.st_size,
        "created_at": datetime.utcfromtimestamp(stat.st_mtime).isoformat() + "Z",
    }


def list_backups() -> List[dict]:
    folder = backup_dir()
    items = [_describe(os.path.join(folder, n)) for n in os.listdir(folder) if n.startswith(BACKUP_PREFIX)]
    return sorted(items, key=lambda i: i["name"], reverse=True)


def prune_old_backups() -> int:
    items = list_backups()
    removed = 0
    for item in items[keep_count():]:
        try:
            os.remove(os.path.join(backup_dir(), item["name"]))
            removed += 1
        except OSError:
            pass
    return removed


def backup_path(name: str) -> Optional[str]:
    """Safe lookup: only plain file names that really are backups in the backup folder."""
    if not name or name != os.path.basename(name) or not name.startswith(BACKUP_PREFIX):
        return None
    path = os.path.join(backup_dir(), name)
    return path if os.path.isfile(path) else None


def backup_due() -> bool:
    items = list_backups()
    if not items:
        return True
    last = datetime.strptime(items[0]["created_at"][:19], "%Y-%m-%dT%H:%M:%S")
    return (datetime.utcnow() - last).total_seconds() >= every_hours() * 3600


def run_backup_if_due() -> Optional[dict]:
    if backups_enabled() and backup_due():
        return run_backup()
    return None


def check_database_alive() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return True
