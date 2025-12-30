import os
from typing import List, Dict, Any, Literal, Optional
from typing_extensions import TypedDict

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_ollama import ChatOllama
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_chroma import Chroma
from langchain_classic.retrievers.ensemble import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document

from langgraph.graph import StateGraph, END

# from flashrank import Ranker, RerankRequest # Removed due to ONNX issues
from chroma_utils import get_vector_store
from dotenv import load_dotenv

load_dotenv()

# --- CONFIG ---
LLM_MODEL = os.getenv("LLM_MODEL_NAME", "llama3.1")
VISION_MODEL = os.getenv("VISION_MODEL_NAME", "llama3.2-vision")
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", 5))
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_KEEP_ALIVE = os.getenv("OLLAMA_KEEP_ALIVE", "5m")

# --- STATE ---
class GraphState(TypedDict):
    question: str
    product_id: Optional[int]  # Filter retrieval by product
    documents: List[Document]
    generation: str
    web_search: str  # "Yes" or "No" - though we are offline, logical placeholder for fallback
    status: str  # For UI feedback: "analyzing", "retrieving", "verifying", "generating"
    chat_history: List[BaseMessage]  # Conversation memory
    rewrite_count: int  # Track number of query rewrites to prevent infinite loops

# --- LLM ---
llm = ChatOllama(model=LLM_MODEL, temperature=0, base_url=OLLAMA_BASE_URL, keep_alive=OLLAMA_KEEP_ALIVE)

# --- GREETING PATTERNS ---
GREETING_PATTERNS = [
    "hi", "hello", "hey", "merhaba", "selam", "good morning", "good afternoon", 
    "good evening", "howdy", "greetings", "yo", "sup", "whats up", "what's up",
    "how are you", "nasılsın", "naber", "ne haber", "günaydın", "iyi günler",
    "iyi akşamlar", "hola", "bonjour", "hallo", "ciao"
]

def is_greeting(question: str) -> bool:
    """Check if the question is a simple greeting"""
    cleaned = question.lower().strip().rstrip("?!.,")
    # Check exact match or starts with greeting
    for pattern in GREETING_PATTERNS:
        if cleaned == pattern or cleaned.startswith(pattern + " "):
            return True
    return False

# --- INTENT CLASSIFIER ---
def classify_intent(state: GraphState):
    """
    Classify the user's intent to handle greetings separately from technical questions.
    """
    print("---CLASSIFY INTENT---")
    question = state["question"]
    
    if is_greeting(question):
        print("---DETECTED GREETING, SKIPPING RAG---")
        return {"status": "greeting"}
    else:
        print("---DETECTED QUESTION, PROCEEDING TO RAG---")
        return {"status": "question"}

def intent_router(state: GraphState):
    """Route based on intent classification"""
    if state.get("status") == "greeting":
        return "greeting_response"
    return "contextualize"

# --- PREDEFINED GREETING RESPONSES (No LLM call - instant!) ---
import random

GREETING_RESPONSES = [
    "Hello! I'm Orion, your Telecom Support Assistant. How can I help you today?",
    "Hi there! Ready to assist with any telecom questions you have.",
    "Hey! What can I do for you today?",
    "Greetings! I'm here to help with your telecom support needs.",
    "Hello! How may I assist you?",
]

TURKISH_GREETINGS = ["merhaba", "selam", "günaydın", "iyi günler", "iyi akşamlar", "naber", "ne haber", "nasılsın"]

TURKISH_RESPONSES = [
    "Merhaba! Ben Orion, Telekomünikasyon Destek Asistanınız. Size nasıl yardımcı olabilirim?",
    "Selam! Bugün size nasıl yardımcı olabilirim?",
    "Merhaba! Telekomünikasyon sorularınız için buradayım.",
]

# --- GREETING RESPONSE (Instant - No LLM) ---
def greeting_response(state: GraphState):
    """Return an instant, predefined greeting response - NO LLM CALL"""
    print("---INSTANT GREETING RESPONSE (No LLM)---")
    question = state["question"].lower().strip()
    
    # Check if Turkish greeting
    is_turkish = any(tr in question for tr in TURKISH_GREETINGS)
    
    if is_turkish:
        response = random.choice(TURKISH_RESPONSES)
    else:
        response = random.choice(GREETING_RESPONSES)
    
    return {"generation": response, "status": "generated"}

# --- CONTEXTUALIZE QUESTION (for chat history) ---
def contextualize_question(state: GraphState):
    """
    If there's chat history, rewrite the question to be standalone
    so the retriever can understand context like "it", "that", etc.
    """
    print("---CONTEXTUALIZE QUESTION---")
    question = state["question"]
    chat_history = state.get("chat_history", [])
    
    # If no history, return question as-is
    if not chat_history:
        print("---NO HISTORY, USING ORIGINAL QUESTION---")
        return {"question": question}
    
    # Create a standalone question using chat history
    contextualize_prompt = ChatPromptTemplate.from_messages([
        ("system", """Given a chat history and the latest user question which might reference context 
in the chat history, formulate a standalone question which can be understood without the chat history. 
Do NOT answer the question, just reformulate it if needed and otherwise return it as is."""),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}")
    ])
    
    chain = contextualize_prompt | llm | StrOutputParser()
    standalone_question = chain.invoke({
        "chat_history": chat_history,
        "question": question
    })
    
    print(f"---STANDALONE QUESTION: {standalone_question}---")
    return {"question": standalone_question}

# --- RETRIEVAL: Hybrid + Rerank ---
def retrieve_documents(state: GraphState):
    print("---RETRIEVE---")
    question = state["question"]
    product_id = state.get("product_id")
    
    # 1. Vector Search with product filter
    vector_store = get_vector_store()
    
    # Build filter for product_id if specified
    filter_dict = None
    if product_id:
        filter_dict = {"product_id": product_id}
        print(f"---FILTERING BY PRODUCT: {product_id}---")
    
    vector_retriever = vector_store.as_retriever(
        search_kwargs={"k": RETRIEVAL_TOP_K, "filter": filter_dict} if filter_dict else {"k": RETRIEVAL_TOP_K}
    )
    
    # 2. BM25 - filter by product_id in metadata
    all_docs = vector_store.get()["documents"]
    all_meta = vector_store.get()["metadatas"]
    
    docs_objects = []
    if all_docs:
        for res_text, res_meta in zip(all_docs, all_meta):
            # Filter by product_id if specified
            if product_id:
                if res_meta.get("product_id") == product_id:
                    docs_objects.append(Document(page_content=res_text, metadata=res_meta))
            else:
                docs_objects.append(Document(page_content=res_text, metadata=res_meta))
    
    if not docs_objects:
        bm25_retriever = None
    else:
        bm25_retriever = BM25Retriever.from_documents(docs_objects)
        bm25_retriever.k = RETRIEVAL_TOP_K

    # 3. Ensemble
    if bm25_retriever:
        ensemble_retriever = EnsembleRetriever(
            retrievers=[bm25_retriever, vector_retriever],
            weights=[0.5, 0.5]
        )
        docs = ensemble_retriever.invoke(question)
    else:
        docs = vector_retriever.invoke(question)
    
    return {"documents": docs, "status": "retrieved"}

# --- GRADER (Corrective) ---
def grade_documents(state: GraphState):
    print("---CHECK RELEVANCE---")
    question = state["question"]
    documents = state["documents"]
    
    # If no documents at all, skip grading and go to generate
    if not documents:
        print("---NO DOCUMENTS FOUND, SKIPPING TO GENERATE---")
        return {"documents": [], "web_search": "No", "status": "verified"}
    
    # Score each doc
    filtered_docs = []
    web_search = "No"  # Default offline
    
    prompt = ChatPromptTemplate.from_template(
        """You are a grader assessing relevance of a retrieved document to a user question. \n 
        Here is the retrieved document: \n\n {document} \n\n
        Here is the user question: {question} \n
        If the document contains keywords or semantic meaning related to the question, grade it as relevant. \n
        Give a binary score 'yes' or 'no' score to indicate whether the document is relevant to the question."""
    )
    
    # Structured output for grader
    # For local LLMs without forced tool calling, we use JSON parsing or simple string check
    chain = prompt | llm | StrOutputParser()
    
    for d in documents:
        score = chain.invoke({"question": question, "document": d.page_content})
        if "yes" in score.lower():
            filtered_docs.append(d)
        else:
            continue
            
    if not filtered_docs:
        # In a purely offline mode without web search, we might loop back to Query Rewrite
        # For this specifc project specs: "Query Rewrite yap ve tekrar ara. (İnternet araması YOK, sadece local loop)."
        web_search = "Yes"  # Logic flag for "Need Rewrite"
        
    return {"documents": filtered_docs, "web_search": web_search, "status": "verified"}

# --- GENERATE ---
# Helper function removed


def generate(state: GraphState):
    print("---GENERATE---")
    question = state["question"]
    documents = state["documents"]
    chat_history = state.get("chat_history", [])
    
    # Check if we have relevant documents
    has_documents = bool(documents)
    
    # Format context from documents
    context = "\n\n".join([doc.page_content for doc in documents]) if documents else ""
    
    # Dynamic system prompt based on whether we have context
    if has_documents:
        system_prompt = """You are Orion, an expert Telecom Support Assistant. 
You have access to relevant documentation to answer the user's question.

Use the following context from documents to answer:
{context}

Guidelines:
- Answer based on the provided context
- Be concise but thorough
- If the context doesn't contain the answer, say so clearly
- Use conversation history for follow-up questions"""
    else:
        system_prompt = """You are Orion, an expert Telecom Support Assistant.

No relevant documents were found for this query. However, you can still:
- Respond to greetings and casual conversation naturally
- Provide general telecom knowledge from your training
- Ask clarifying questions to help the user find what they need
- Explain what types of documents or questions you can help with

Be friendly, professional, and helpful. If the user is asking about specific products or technical documentation, let them know you need documents uploaded first."""
    
    # Prompt with chat history support
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{question}")
    ])
    
    chain = prompt | llm | StrOutputParser()
    generation = chain.invoke({
        "context": context,
        "chat_history": chat_history,
        "question": question
    })
    
    # Programmatically append sources - REMOVED per user request
    # generation = generation.strip() + format_sources_footer(documents)
    
    return {"generation": generation, "status": "generated"}

# --- STREAMING GENERATE WITH STATUS EVENTS (for SSE) ---
# --- STREAMING GENERATE WITH STATUS EVENTS (for SSE) ---
async def stream_generate_with_status(question: str, product_id: Optional[int], chat_history: List[BaseMessage], image: Optional[str] = None):
    """
    Async generator that streams BOTH status updates AND LLM tokens.
    Yields JSON-like tuples: (event_type, content)
      - ("status", "SCANNING DATABASE SECTORS...")
      - ("token", "G9 is a...")
    """
    print("---STREAM GENERATE WITH STATUS---")
    
    # Status 1: Analyzing
    yield ("status", "INITIALIZING QUERY PROTOCOL...")
    
    # Check if image is present - if so, use Vision Model
    if image:
        yield ("status", "ANALYZING VISUAL DATA...")
        
        # Use Vision Model
        vision_llm = ChatOllama(model=VISION_MODEL, temperature=0, base_url=OLLAMA_BASE_URL, keep_alive=OLLAMA_KEEP_ALIVE)
        
        system_prompt = """You are Orion, an expert Telecom Support Assistant with visual analysis capabilities.
You are analyzing an image provided by the user.
- Identification: Identify the device, component, or interface shown.
- Diagnostics: Look for error codes, LED patterns, or physical damage.
- Context: Use the user's question to guide your analysis.
- Tone: Professional, technical, and precise.
"""
        # Construct multimodal message
        # image should be a base64 data string (e.g., "data:image/png;base64,...")
        # Ensure we just send the base64 part if expected, BUT langchain-ollama usually handles the data URI format fine or expects base64.
        # Ollama API expects base64 string in 'images' field. LangChain handles this mapping.
        # We will assume 'image' is the full data URI or base64. LangChain's HumanMessage with image_url handles data URIs.
        
        message = HumanMessage(
            content=[
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": image},
            ]
        )
        
        messages = [
            SystemMessage(content=system_prompt),
            message
        ]
        
        yield ("status", "GENERATING DIAGNOSTIC REPORT...")
        
        async for chunk in vision_llm.astream(messages):
            if chunk.content:
                yield ("token", chunk.content)
        
        yield ("status", "TRANSMISSION COMPLETE")
        return  # End stream here for vision path
    
    # 1. Contextualize if there's history
    if chat_history:
        yield ("status", "PROCESSING CONVERSATION CONTEXT...")
        contextualize_prompt = ChatPromptTemplate.from_messages([
            ("system", """Given a chat history and the latest user question which might reference context 
in the chat history, formulate a standalone question which can be understood without the chat history. 
Do NOT answer the question, just reformulate it if needed and otherwise return it as is."""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}")
        ])
        chain = contextualize_prompt | llm | StrOutputParser()
        question = chain.invoke({"chat_history": chat_history, "question": question})
        print(f"---CONTEXTUALIZED: {question}---")
    
    # Status 2: Searching
    yield ("status", "SCANNING DATABASE SECTORS...")
    
    # 2. Retrieve documents
    vector_store = get_vector_store()
    filter_dict = {"product_id": product_id} if product_id else None
    
    vector_retriever = vector_store.as_retriever(
        search_kwargs={"k": RETRIEVAL_TOP_K, "filter": filter_dict} if filter_dict else {"k": RETRIEVAL_TOP_K}
    )
    documents = vector_retriever.invoke(question)
    doc_count = len(documents)
    print(f"---RETRIEVED {doc_count} DOCUMENTS---")
    
    # Status 3: Documents found
    if doc_count > 0:
        yield ("status", f"DOCUMENTS LOCATED: {doc_count} MATCHES")
        
        # Extract sources
        seen_sources = set()
        sources_list = []
        for doc in documents:
            source = doc.metadata.get("source", "Unknown Document")
            # Clean up filename (remove path)
            filename = os.path.basename(source)
            page = doc.metadata.get("page", 0) + 1  # 0-indexed usually
            
            identifier = f"{filename}-{page}"
            if identifier not in seen_sources:
                seen_sources.add(identifier)
                sources_list.append({"filename": filename, "page": page})
        
        # Yield sources event
        if sources_list:
            import json
            yield ("sources", json.dumps(sources_list))
            
    else:
        yield ("status", "NO MATCHING RECORDS FOUND")
    
    # Status 4: Generating
    yield ("status", "GENERATING RESPONSE SEQUENCE...")
    
    # 3. Build context and prompt
    has_documents = bool(documents)
    # context = "\n\n".join([doc.page_content for doc in documents]) if documents else ""
    context_parts = []
    if documents:
        for doc in documents:
            source = os.path.basename(doc.metadata.get("source", "Unknown"))
            page = doc.metadata.get("page", 0) + 1
            context_parts.append(f"{doc.page_content}\n(Source: {source}, Page: {page})")
    context = "\n\n".join(context_parts)
    
    if has_documents:
        system_prompt = f"""You are Orion, an expert Telecom Support Assistant. 
You have access to relevant documentation to answer the user's question.

Use the following context from documents to answer:
{context}

Guidelines:
- Answer based on the provided context
- Be concise but thorough
- If the context doesn't contain the answer, say so clearly
- Use conversation history for follow-up questions"""
    else:
        system_prompt = """You are Orion, an expert Telecom Support Assistant.

No relevant documents were found for this query. However, you can still:
- Provide general telecom knowledge from your training
- Ask clarifying questions to help the user find what they need
- Explain what types of documents or questions you can help with

Be friendly, professional, and helpful."""
    
    # 4. Stream the LLM response
    
    messages = [SystemMessage(content=system_prompt)]
    messages.extend(chat_history)
    messages.append(HumanMessage(content=question))
    
    # Use streaming with Ollama
    streaming_llm = ChatOllama(model=LLM_MODEL, temperature=0, base_url=OLLAMA_BASE_URL, keep_alive=OLLAMA_KEEP_ALIVE)
    
    async for chunk in streaming_llm.astream(messages):
        if chunk.content:
            yield ("token", chunk.content)
            
    # Programmatically append sources
    # Programmatically append sources - REMOVED per user request
    # yield ("token", format_sources_footer(documents))
    
    # Final status
    yield ("status", "TRANSMISSION COMPLETE")

# --- ROUTER / REWRITE ---
MAX_REWRITES = 2  # Maximum number of query rewrites before giving up

def retrieval_grader(state: GraphState):
    # Conditional edge logic
    rewrite_count = state.get("rewrite_count", 0)
    
    if state["web_search"] == "Yes" and rewrite_count < MAX_REWRITES:
        print(f"---DECISION: REWRITE (attempt {rewrite_count + 1}/{MAX_REWRITES})---")
        return "rewrite"
    else:
        if state["web_search"] == "Yes":
            print("---MAX REWRITES REACHED, PROCEEDING TO GENERATE---")
        else:
            print("---DECISION: GENERATE---")
        return "generate"

def rewrite_query(state: GraphState):
    print("---REWRITE QUERY---")
    question = state["question"]
    rewrite_count = state.get("rewrite_count", 0)
    
    prompt = ChatPromptTemplate.from_template(
        """You are a question re-writer that converts an input question to a better version that is optimized 
        for vectorstore retrieval. Look at the initial and formulate an improved question. 
        Question: {question} 
        Improved Question:"""
    )
    
    chain = prompt | llm | StrOutputParser()
    better_question = chain.invoke({"question": question})
    
    # Increment rewrite count and reset web_search flag
    return {"question": better_question, "web_search": "No", "rewrite_count": rewrite_count + 1}

# --- VISUAL (Placeholder for Logic) ---
# If vision needed, we would add another node. For now, we integrate Llama Vision if image path is detected?
# For text-based RAG, we stick to above.

# --- GRAPH ---
workflow = StateGraph(GraphState)

# Define Nodes
workflow.add_node("classify_intent", classify_intent)  # NEW: First node - intent classification
workflow.add_node("greeting_response", greeting_response)  # NEW: Direct response for greetings
workflow.add_node("contextualize", contextualize_question)
workflow.add_node("retrieval", retrieve_documents)
workflow.add_node("grader", grade_documents)
workflow.add_node("generate", generate)
workflow.add_node("rewrite", rewrite_query)

# Build Graph - Start with intent classification
workflow.set_entry_point("classify_intent")

# Route based on intent
workflow.add_conditional_edges(
    "classify_intent",
    intent_router,
    {
        "greeting_response": "greeting_response",
        "contextualize": "contextualize",
    },
)

# Greeting path goes directly to END
workflow.add_edge("greeting_response", END)

# Question path goes through RAG pipeline
workflow.add_edge("contextualize", "retrieval")
workflow.add_edge("retrieval", "grader")
workflow.add_conditional_edges(
    "grader",
    retrieval_grader,
    {
        "rewrite": "rewrite",
        "generate": "generate",
    },
)
workflow.add_edge("rewrite", "retrieval")  # Loop back
workflow.add_edge("generate", END)

app_graph = workflow.compile()

