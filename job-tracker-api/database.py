import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Read DATABASE_URL from environment, falling back to local SQLite
raw_url = os.getenv("DATABASE_URL", "sqlite:///./jobtracker.db")

# Clean whitespace and quotes
DATABASE_URL = raw_url.strip().strip('"').strip("'")

# Fix Heroku / Render legacy postgres:// prefix for SQLAlchemy compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Remove pgbouncer query params which cause psycopg2 DSN parse errors
if "?pgbouncer=true" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?pgbouncer=true", "")
elif "&pgbouncer=true" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("&pgbouncer=true", "")

# Conditional arguments: check_same_thread is only required for SQLite
connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}

# Build SQLAlchemy Engine with pool pre-ping
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300 if "sqlite" not in DATABASE_URL else -1,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()