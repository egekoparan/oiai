import os
from datetime import datetime
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, JSON, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from dotenv import load_dotenv

load_dotenv()

SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "./data/telecortex.db")
# Ensure directory exists
os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{SQLITE_DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# --- Product Model ---
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to documents
    documents = relationship("DocumentRegistry", back_populates="product", cascade="all, delete-orphan")

# --- Document Registry Model ---
class DocumentRegistry(Base):
    __tablename__ = "document_registry"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    file_hash = Column(String, unique=True, index=True) # SHA-256
    upload_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="processed") # processed, failed
    metadata_info = Column(JSON, default={})
    
    # Foreign key to Product
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    product = relationship("Product", back_populates="documents")

class FeedbackLogs(Base):
    __tablename__ = "feedback_logs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(String)
    response = Column(String)
    feedback = Column(String) # "up", "down"
    timestamp = Column(DateTime, default=datetime.utcnow)
    # Optional: link to document chunks used

def init_db():
    Base.metadata.create_all(bind=engine)
    # No default products - admin will create them

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
