from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv
from database import init_db, Product, DocumentRegistry

load_dotenv()

API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", 8000))
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"

app = FastAPI(
    title="Tele-Cortex Local API",
    description="Offline Multimodal RAG Assistant",
    version="1.0.0",
    docs_url="/docs" if DEBUG_MODE else None,
    redoc_url=None
)

# CORS Configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "*",  # Allow all for Docker
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()
    print("Database initialized.")

@app.get("/")
def health_check():
    return {"status": "running", "project": "Tele-Cortex Local"}

# Import after app creation to avoid circular imports if any, keeping it simple here
from sqlalchemy.orm import Session
from fastapi import UploadFile, File, Depends, HTTPException
from database import get_db
from ingestion import process_upload
from pydantic import BaseModel
from typing import Optional

# ============ PRODUCT ENDPOINTS ============

class ProductCreate(BaseModel):
    name: str

class ProductResponse(BaseModel):
    id: int
    name: str

@app.get("/products")
def list_products(db: Session = Depends(get_db)):
    """Get all products"""
    products = db.query(Product).all()
    return [{"id": p.id, "name": p.name} for p in products]

@app.post("/products")
def create_product(product: ProductCreate, db: Session = Depends(get_db)):
    """Create a new product (admin only)"""
    # Check if exists
    existing = db.query(Product).filter(Product.name == product.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product already exists")
    
    new_product = Product(name=product.name)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return {"id": new_product.id, "name": new_product.name}

@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product and all its documents"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db.delete(product)  # Cascade deletes documents due to relationship
    db.commit()
    return {"message": f"Product '{product.name}' deleted"}

# ============ DOCUMENT ENDPOINTS ============

@app.get("/products/{product_id}/documents")
def list_product_documents(product_id: int, db: Session = Depends(get_db)):
    """Get all documents for a specific product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    documents = db.query(DocumentRegistry).filter(DocumentRegistry.product_id == product_id).all()
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "upload_date": d.upload_date.isoformat() if d.upload_date else None,
            "status": d.status
        }
        for d in documents
    ]

@app.post("/products/{product_id}/upload")
async def upload_to_product(product_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload a document to a specific product"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return await process_upload(file, db, product_id=product_id)

@app.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a specific document"""
    doc = db.query(DocumentRegistry).filter(DocumentRegistry.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    db.delete(doc)
    db.commit()
    return {"message": f"Document '{doc.filename}' deleted"}

# ============ LEGACY UPLOAD (Global) ============
@app.post("/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await process_upload(file, db)

# ============ CHAT ENDPOINT ============
from rag_graph import app_graph, is_greeting, GREETING_RESPONSES, TURKISH_GREETINGS, TURKISH_RESPONSES
from langchain_core.messages import HumanMessage, AIMessage
from typing import List
from fastapi.responses import StreamingResponse
import json
import random

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    question: str
    product_id: Optional[int] = None  # Optional: filter by product
    chat_history: Optional[List[ChatMessage]] = None  # Conversation history
    image: Optional[str] = None  # Base64 encoded image data if provided

# Original non-streaming endpoint (keep for compatibility)
@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    # Convert chat_history to LangChain message format
    lc_history = []
    if request.chat_history:
        for msg in request.chat_history:
            if msg.role == "user":
                lc_history.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                lc_history.append(AIMessage(content=msg.content))
    
    # Invoke LangGraph with product_id and chat_history
    inputs = {
        "question": request.question,
        "product_id": request.product_id,
        "chat_history": lc_history,
        "image": request.image 
    }
    result = app_graph.invoke(inputs)
    return {"answer": result.get("generation", "No answer generated.")}

# NEW: Streaming chat endpoint with status events
@app.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest):
    """Stream the LLM response with status updates and tokens using Server-Sent Events"""
    from rag_graph import stream_generate_with_status
    
    # Convert chat_history to LangChain message format
    lc_history = []
    if request.chat_history:
        for msg in request.chat_history:
            if msg.role == "user":
                lc_history.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                lc_history.append(AIMessage(content=msg.content))
    
    question = request.question
    product_id = request.product_id
    
    async def generate_stream():
        # Check if it's a greeting - instant response, no streaming needed
        if is_greeting(question):
            is_turkish = any(tr in question.lower() for tr in TURKISH_GREETINGS)
            if is_turkish:
                response = random.choice(TURKISH_RESPONSES)
            else:
                response = random.choice(GREETING_RESPONSES)
            
            # Emit greeting status
            yield f"data: {json.dumps({'type': 'status', 'content': 'GREETING PROTOCOL INITIATED...'})}\n\n"
            
            # Stream the greeting character by character for smooth UI
            for char in response:
                yield f"data: {json.dumps({'type': 'token', 'content': char})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
            return
        
        # For actual questions, use the streaming generator with status events
        async for event_type, content in stream_generate_with_status(question, product_id, lc_history, image=request.image):
            yield f"data: {json.dumps({'type': event_type, 'content': content})}\n\n"
        
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


