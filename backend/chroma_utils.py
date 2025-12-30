import os
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from dotenv import load_dotenv
import chromadb

load_dotenv()

CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./data/chroma_db")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL_NAME", "nomic-embed-text")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Ensure directory exists
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

def get_embedding_function():
    return OllamaEmbeddings(
        model=EMBEDDING_MODEL,
        base_url=OLLAMA_BASE_URL
    )

def get_vector_store():
    # Persistent Client
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    
    embedding_function = get_embedding_function()
    
    vector_store = Chroma(
        client=client,
        collection_name="telecortex_docs",
        embedding_function=embedding_function,
    )
    return vector_store
