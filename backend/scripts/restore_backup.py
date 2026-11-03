"""
Restore a LifeFlow SQLite backup.

    python scripts/restore_backup.py backups/lifeflow-backup-20261017-020000.sqlite.gz

Stop the backend first. The current database file is kept next to it as <name>.before-restore
so nothing is lost if you restored the wrong file. JSON/SQL backups (PostgreSQL) are restored
with `psql` (for .sql.gz) -- see README.
"""
import gzip
import os
import shutil
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.config import DATABASE_URL  # noqa: E402


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 1
    source = sys.argv[1]
    if not source.endswith(".sqlite.gz"):
        print("This script restores .sqlite.gz backups. For .sql.gz use: gunzip -c FILE | psql DATABASE_URL")
        return 1
    if not DATABASE_URL.startswith("sqlite"):
        print("The configured database is not SQLite.")
        return 1
    target = DATABASE_URL.split("///", 1)[-1]
    if os.path.exists(target):
        keep = f"{target}.before-restore-{datetime.now():%Y%m%d-%H%M%S}"
        shutil.copy2(target, keep)
        print(f"Current database saved as {keep}")
    with gzip.open(source, "rb") as src, open(target, "wb") as dst:
        shutil.copyfileobj(src, dst)
    print(f"Restored {source} -> {target}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
