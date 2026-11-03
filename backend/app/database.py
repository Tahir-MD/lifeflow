from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import DATABASE_URL

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

# Neon pauses idle databases, so pre-ping (and recycle) connections to avoid "connection closed" errors.
engine_options = {} if DATABASE_URL.startswith("sqlite") else {"pool_pre_ping": True, "pool_recycle": 300, "pool_size": 5, "max_overflow": 5}
engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_options)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
