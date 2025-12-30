import hashlib
import os
import shutil
from typing import List, Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from langchain_community.document_loaders import UnstructuredFileLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from database import DocumentRegistry
from chroma_utils import get_vector_store
from dotenv import load_dotenv

load_dotenv()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))

def calculate_file_hash(file_path: str) -> str:
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

async def process_upload(file: UploadFile, db: Session, product_id: Optional[int] = None):
    # 1. Save file temporarily
    temp_file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(temp_file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 2. Calculate Hash
    file_hash = calculate_file_hash(temp_file_path)
    
    # 3. Check Duplicate in DB
    existing_doc = db.query(DocumentRegistry).filter(DocumentRegistry.file_hash == file_hash).first()
    if existing_doc:
        os.remove(temp_file_path) # Clean up
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate Content Detected. File hash {file_hash} already exists."
        )
    
    # 4. Ingest (Parse & Chunk)
    try:
        # Check extension
        ext = os.path.splitext(file.filename)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(temp_file_path)
        else:
            loader = UnstructuredFileLoader(temp_file_path)
            
        docs = loader.load()
        
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP
        )
        chunks = text_splitter.split_documents(docs)
        
        # Add metadata
        for chunk in chunks:
            chunk.metadata["source"] = file.filename
            chunk.metadata["file_hash"] = file_hash
            if product_id:
                chunk.metadata["product_id"] = product_id
            
        # 5. Index to ChromaDB
        vector_store = get_vector_store()
        vector_store.add_documents(chunks)
        
        # 6. Register in DB
        new_doc = DocumentRegistry(
            filename=file.filename,
            file_hash=file_hash,
            status="processed",
            metadata_info={"chunk_count": len(chunks)},
            product_id=product_id  # Associate with product
        )
        db.add(new_doc)
        db.commit()
        db.refresh(new_doc)
        
        return {"status": "success", "filename": file.filename, "chunks": len(chunks), "product_id": product_id}
        
    except Exception as e:
        db.rollback()
        # Clean up if needed, though we might want to keep failed files for debugging
        raise HTTPException(status_code=500, detail=str(e))

