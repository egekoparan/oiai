# Enterprise Local RAG & Agentic AI Platform

An enterprise-grade, privacy-focused Agentic RAG system built to process company PDF documents locally. The platform allows users to query internal documentation, manuals, and policy files through a local LLM workflow without transmitting data to third-party APIs.

## Tech Stack

### Backend
- **Framework:** Python, FastAPI
- **Orchestration / Agent Logic:** LangChain, LangGraph (`rag_graph.py`)
- **Vector Database:** ChromaDB (`chroma_utils.py`)
- **Document Ingestion:** PyPDF / LangChain Document Loaders (`ingestion.py`)
- **Database:** SQLite / PostgreSQL (`database.py`)

### Frontend
- **Framework:** Next.js (TypeScript)
- **UI & Styling:** React, Tailwind CSS

### Infrastructure
- **Containerization:** Docker & Docker Compose (`Dockerfile`)

## Architecture & System Design

1. **Document Ingestion Pipeline (`ingestion.py` & `chroma_utils.py`)**
   - Company PDF documents are parsed, chunked into context-preserving segments, and converted into embeddings.
   - Vector embeddings are indexed locally in ChromaDB for fast similarity retrieval.

2. **Agentic RAG State Graph (`rag_graph.py`)**
   - Built using LangGraph to handle complex retrieval workflows, routing queries based on intent and document context.
   - Evaluates retrieved document relevance before passing context to the local LLM to minimize hallucination.

3. **Backend API (`main.py`)**
   - Exposes RESTful endpoints built with FastAPI to interface between the Next.js frontend and the local agent pipeline.

4. **Frontend UI (`frontend/`)**
   - Modern chat and document interaction interface built with Next.js, allowing document upload, search history management, and real-time responses.

## Getting Started

### Prerequisites
- Docker and Docker Compose installed locally.

### Running with Docker

1. Clone the repository:
   ```bash
   git clone [https://github.com/egekoparan/oiai.git](https://github.com/egekoparan/oiai.git)
   cd oiai


   Start backend and frontend services:

   docker-compose up --build

   Frontend UI: http://localhost:3000
   Backend API Docs: http://localhost:8000/docs

   
