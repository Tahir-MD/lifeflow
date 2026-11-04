from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Neon (and most hosted Postgres) silently closes idle connections. pool_pre_ping
# tests a pooled connection before using it and reconnects if it was dropped, and
# pool_recycle retires connections before the server does. Without these, the first
# request after a quiet period fails with "SSL connection has been closed unexpectedly".
engine_options = {}
if not DATABASE_URL.startswith("sqlite"):
    engine_options = {"pool_pre_ping": True, "pool_recycle": 280}

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
