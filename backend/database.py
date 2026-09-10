import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Default to SQLite for easy local dev if Postgres URL is not provided
# To use Postgres, set DATABASE_URL="postgresql://user:password@localhost/dbname"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./warehouse.db")

engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
