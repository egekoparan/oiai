"use client";

import { useEffect, useState, useRef } from "react";
import Background from "@/components/Background";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import Input from "@/components/Input";
import Toast from "@/components/Toast";
import MiniLogo from "@/components/MiniLogo";
import UserMenu from "@/components/UserMenu";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Document {
    id: number;
    filename: string;
    upload_date: string;
    status: string;
}

export default function Dashboard() {
    const [role, setRole] = useState<string | null>(null);
    const [productId, setProductId] = useState<number | null>(null);
    const [productName, setProductName] = useState<string>("");
    const [chatInput, setChatInput] = useState("");
    const [documents, setDocuments] = useState<Document[]>([]);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
        message: "",
        type: "info",
        isVisible: false,
    });
    const [isThinking, setIsThinking] = useState(false);
    const [thinkingStep, setThinkingStep] = useState("");
    const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSteps, setUploadSteps] = useState<string[]>([]);
    const [uploadFileName, setUploadFileName] = useState("");
    const [isDragOver, setIsDragOver] = useState(false);

    // Image Upload State
    const [chatImage, setChatImage] = useState<string | null>(null);
    const [isChatDragOver, setIsChatDragOver] = useState(false);
    const chatImageInputRef = useRef<HTMLInputElement>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const stepIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const router = useRouter();
    const isAdmin = role === "admin";

    const [messages, setMessages] = useState<{ role: "user" | "system", content: string, image?: string | null, sources?: { filename: string, page: number }[] }[]>([
        { role: "system", content: "System initialized. Uplink established. Awaiting input." }
    ]);

    useEffect(() => {
        const storedRole = sessionStorage.getItem("userRole");
        const storedProductId = sessionStorage.getItem("selectedProductId");
        const storedProductName = sessionStorage.getItem("selectedProductName");

        if (!storedRole) {
            router.push("/");
        } else {
            setRole(storedRole);
            if (storedProductId) {
                setProductId(parseInt(storedProductId));
                setProductName(storedProductName || "");
            }
        }
    }, [router]);

    useEffect(() => {
        if (productId && role === "admin") {
            fetchDocuments();
        }
    }, [productId, role]);

    const fetchDocuments = async () => {
        if (!productId) return;
        try {
            const res = await fetch(`${API_URL}/products/${productId}/documents`);
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
            }
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        }
    };

    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll on new messages if user is near bottom
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
            if (isNearBottom) {
                container.scrollTo({ top: scrollHeight, behavior: "smooth" });
            }
        }
    }, [messages]);

    const showToast = (message: string, type: "success" | "error" | "info") => {
        setToast({ message, type, isVisible: true });
    };

    const processFileUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        // Start upload progress UI
        setIsUploading(true);
        setUploadFileName(file.name);
        setUploadSteps([]);

        const progressSteps = [
            "Uploading file...",
            "Parsing document...",
            "Extracting text...",
            "Generating embeddings...",
            "Indexing to vector store...",
        ];

        let stepIndex = 0;
        const stepInterval = setInterval(() => {
            if (stepIndex < progressSteps.length) {
                setUploadSteps(prev => [...prev, progressSteps[stepIndex]]);
                stepIndex++;
            }
        }, 800);

        try {
            const uploadUrl = productId
                ? `${API_URL}/products/${productId}/upload`
                : `${API_URL}/upload`;

            const res = await fetch(uploadUrl, {
                method: "POST",
                headers: {
                    // Start of Selection
                },
                body: formData,
            });

            clearInterval(stepInterval);

            if (res.ok) {
                setUploadSteps(prev => [...prev, "✓ Complete!"]);
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadSteps([]);
                    showToast("Data Ingested Successfully.", "success");
                    fetchDocuments();
                }, 1000);
            } else if (res.status === 409) {
                setUploadSteps(prev => [...prev, "✗ Duplicate detected!"]);
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadSteps([]);
                    showToast("Duplicate Content Detected. Upload Aborted.", "error");
                }, 1000);
            } else {
                setUploadSteps(prev => [...prev, "✗ Upload failed!"]);
                setTimeout(() => {
                    setIsUploading(false);
                    setUploadSteps([]);
                    showToast("Upload Failed. System Error.", "error");
                }, 1000);
            }
        } catch (error) {
            clearInterval(stepInterval);
            console.error("Upload error:", error);
            setUploadSteps(prev => [...prev, "✗ Connection error!"]);
            setTimeout(() => {
                setIsUploading(false);
                setUploadSteps([]);
                showToast("Connection Failed. Check Uplink.", "error");
            }, 1000);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFileUpload(file);
        }
    };

    const handleDeleteDocument = async (docId: number, filename: string) => {
        const firstConfirm = confirm(`Are you sure you want to delete "${filename}"?`);
        if (!firstConfirm) return;

        const secondConfirm = confirm(`WARNING: This action cannot be undone! "${filename}" will be permanently deleted. Do you want to continue?`);
        if (!secondConfirm) return;

        try {
            const res = await fetch(`${API_URL}/documents/${docId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                showToast("Document deleted.", "success");
                fetchDocuments();
            } else {
                showToast("Failed to delete document.", "error");
            }
        } catch (error) {
            showToast("Connection error.", "error");
        }
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatInput("");
        setMessages(prev => [...prev, { role: "user", content: userMsg, image: chatImage }]);

        // Start thinking UI with initial status
        setIsThinking(true);
        setThinkingStep("TRANSMITTING_QUERY_PACKET...");
        setThinkingSteps(["TRANSMITTING_QUERY_PACKET..."]);

        // Create AbortController for cancellation
        abortControllerRef.current = new AbortController();

        try {
            // Use streaming endpoint
            const res = await fetch(`${API_URL}/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: userMsg,
                    product_id: productId,
                    image: chatImage // Send base64 image
                }),
                signal: abortControllerRef.current.signal,
            });

            // Clear image after sending
            setChatImage(null);

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            // Read the stream
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let streamedContent = "";
            let hasStartedGenerating = false;
            let pendingSources: { filename: string, page: number }[] | undefined;

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });

                    // Parse SSE data
                    const lines = chunk.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));

                                // Handle status events - update thinking UI
                                if (data.type === 'status') {
                                    setThinkingStep(data.content);
                                    setThinkingSteps(prev => {
                                        // Avoid duplicate consecutive statuses
                                        if (prev[prev.length - 1] !== data.content) {
                                            return [...prev, data.content];
                                        }
                                        return prev;
                                    });
                                }

                                // Handle sources event
                                if (data.type === 'sources') {
                                    try {
                                        pendingSources = JSON.parse(data.content);
                                    } catch (e) {
                                        console.error("Error parsing sources:", e);
                                    }
                                }

                                // Handle token events - append to message
                                if (data.type === 'token') {
                                    // First token: stop thinking UI and add empty message
                                    if (!hasStartedGenerating) {
                                        hasStartedGenerating = true;
                                        setIsThinking(false);
                                        setMessages(prev => [...prev, {
                                            role: "system",
                                            content: "",
                                            sources: pendingSources // Attach pending sources
                                        }]);
                                    }

                                    streamedContent += data.content;
                                    // Update the last message with new content
                                    setMessages(prev => {
                                        const newMessages = [...prev];
                                        if (newMessages.length > 0) {
                                            const lastMsg = newMessages[newMessages.length - 1];
                                            newMessages[newMessages.length - 1] = {
                                                ...lastMsg,
                                                content: streamedContent
                                            };
                                        }
                                        return newMessages;
                                    });
                                }

                                // Handle done event
                                if (data.type === 'done') {
                                    setIsThinking(false);
                                    setThinkingStep("");
                                    break;
                                }
                            } catch (e) {
                                // Ignore parse errors for incomplete chunks
                            }
                        }
                    }
                }
            }

            // Ensure thinking is stopped
            setIsThinking(false);
            setThinkingStep("");

        } catch (error: any) {
            if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
            setIsThinking(false);
            setThinkingStep("");
            setThinkingSteps([]);

            if (error.name === 'AbortError') {
                setMessages(prev => [...prev, { role: "system", content: "Response cancelled by user." }]);
            } else {
                console.error("Chat error:", error);
                setMessages(prev => [...prev, { role: "system", content: "Connection Error: Unable to reach neural core." }]);
            }
        }
    };

    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (stepIntervalRef.current) {
            clearInterval(stepIntervalRef.current);
            stepIntervalRef.current = null;
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { // Prevent default only if not adding new lines (though Input is usually single line)
            e.preventDefault(); // Prevent default enter behavior if needed
            handleSendMessage();
        }
    };

    if (!role) return null;

    // Dynamic accent colors based on role
    const accent = isAdmin ? "cyan" : "white";
    const borderColor = isAdmin ? "border-cyan-500/30" : "border-white/30";
    const textAccent = isAdmin ? "text-cyan-100" : "text-white";

    return (
        <main className="relative h-screen flex flex-col p-4 bg-transparent overflow-hidden text-white font-mono">
            <Background />

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            {/* Header */}
            <header className={clsx(
                "relative z-50 w-full max-w-7xl mx-auto flex justify-between items-center mb-8 border-b pb-4",
                isAdmin ? "border-cyan-500/20" : "border-white/20"
            )}>
                <div className="flex items-center gap-3">
                    <div onClick={() => router.push("/device-selection")} className="cursor-pointer">
                        <MiniLogo size="sm" />
                    </div>
                    {productName && (
                        <span className={clsx(
                            "ml-4 px-3 py-1 rounded text-sm uppercase tracking-wider border",
                            isAdmin
                                ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-300"
                                : "bg-white/10 border-white/50 text-white"
                        )}>
                            {productName}
                        </span>
                    )}
                </div>
                <UserMenu role={role} />
            </header>

            {/* Main Content Grid - Fixed Height */}
            <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0 overflow-hidden">

                {/* ADMIN ONLY: File Upload & Document List */}
                {role === "admin" && (
                    <motion.aside
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-1 bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-4 flex flex-col gap-4 h-fit max-h-[80vh] overflow-y-auto"
                    >
                        <h2 className="text-sm font-bold uppercase tracking-widest border-b border-cyan-500/20 pb-2 text-cyan-100">
                            {productName} Data
                        </h2>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept=".txt,.pdf,.md"
                        />

                        {/* Upload Progress UI */}
                        {isUploading ? (
                            <div className="border-2 border-cyan-500/50 rounded-lg p-4 bg-cyan-500/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                                    <span className="text-xs uppercase tracking-widest font-bold text-cyan-400">Processing</span>
                                </div>
                                <p className="text-xs text-white/70 mb-3 truncate">{uploadFileName}</p>
                                <div className="space-y-1">
                                    {uploadSteps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-2 text-xs ${idx === uploadSteps.length - 1
                                                ? step.startsWith("✓") ? "text-green-400" : step.startsWith("✗") ? "text-red-400" : "text-cyan-300"
                                                : "text-cyan-600"
                                                }`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${idx === uploadSteps.length - 1
                                                ? step.startsWith("✓") ? "bg-green-400" : step.startsWith("✗") ? "bg-red-400" : "bg-cyan-400 animate-pulse"
                                                : "bg-cyan-600"
                                                }`} />
                                            {step}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragOver(false);
                                }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsDragOver(false);
                                    const files = e.dataTransfer.files;
                                    if (files && files.length > 0) {
                                        const file = files[0];
                                        const ext = file.name.split('.').pop()?.toLowerCase();
                                        if (['pdf', 'txt', 'md'].includes(ext || '')) {
                                            processFileUpload(file);
                                        } else {
                                            showToast("Invalid file type. Use PDF, TXT or MD.", "error");
                                        }
                                    }
                                }}
                                className={clsx(
                                    "border-2 border-dashed rounded-lg p-6 text-center transition-all text-sm cursor-pointer group",
                                    isDragOver
                                        ? "border-cyan-400 bg-cyan-500/20 scale-105"
                                        : "border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-500/5"
                                )}
                            >
                                <span className={clsx(
                                    "block text-2xl mb-2 transition-opacity",
                                    isDragOver ? "opacity-100" : "opacity-50 group-hover:opacity-100"
                                )}>⬆️</span>
                                {isDragOver ? "Drop file here" : "Add Document"}
                                <span className="block text-xs text-cyan-500/50 mt-1">(PDF, TXT, MD)</span>
                            </div>
                        )}

                        {documents.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-xs uppercase tracking-wider text-cyan-400/70">Uploaded Documents</h3>
                                {documents.map((doc) => (
                                    <div key={doc.id} className="flex items-center justify-between bg-black/30 border border-cyan-500/20 rounded px-3 py-2">
                                        <span className="text-xs truncate flex-1 text-white/80">{doc.filename}</span>
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                                            className="ml-2 text-red-400 hover:text-red-300 text-xs"
                                            title="Delete"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {documents.length === 0 && (
                            <p className="text-xs text-cyan-500/50 text-center">No documents uploaded yet.</p>
                        )}
                    </motion.aside>
                )}

                {/* Chat Interface */}
                <section
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsChatDragOver(true);
                    }}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsChatDragOver(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only set false if leaving the main container
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        setIsChatDragOver(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsChatDragOver(false);
                        const files = e.dataTransfer.files;
                        if (files && files.length > 0) {
                            const file = files[0];
                            if (file.type.startsWith('image/')) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                    setChatImage(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                            } else {
                                showToast("Only images allowed here.", "error");
                            }
                        }
                    }}
                    className={clsx(
                        "bg-black/40 backdrop-blur-md rounded-lg p-6 flex flex-col border transition-all duration-300 h-full max-h-full min-h-0",
                        isAdmin ? "border-cyan-500/30 lg:col-span-3" : "border-white/30 lg:col-span-4",
                        isChatDragOver && (isAdmin ? "border-cyan-400 bg-cyan-500/10 shadow-[0_0_30px_rgba(0,243,255,0.2)]" : "border-white bg-white/10 shadow-[0_0_30px_rgba(255,255,255,0.1)]")
                    )}
                >
                    {/* Drag Overlay */}
                    {isChatDragOver && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg pointer-events-none">
                            <div className={clsx(
                                "border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-4 animate-bounce",
                                "border-cyan-400 text-cyan-400 bg-cyan-950/50"
                            )}>
                                <span className="text-4xl">📷</span>
                                <span className="text-lg font-bold uppercase tracking-widest">Drop Image to Analyze</span>
                            </div>
                        </div>
                    )}

                    <div
                        ref={messagesContainerRef}
                        className="flex-1 min-h-0 mb-4 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                    >
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={clsx(
                                    "p-4 rounded-lg max-w-[80%] text-sm leading-relaxed flex flex-col gap-2 whitespace-pre-wrap",
                                    msg.role === "user"
                                        ? isAdmin
                                            ? "bg-cyan-500/20 text-cyan-50 border border-cyan-500/40 rounded-br-none shadow-[0_0_15px_rgba(0,243,255,0.05)]"
                                            : "bg-white/20 text-white border border-white/40 rounded-br-none shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                                        : isAdmin
                                            ? "bg-cyan-950/50 text-cyan-100 border border-cyan-500/20 rounded-bl-none"
                                            : "bg-gray-900/50 text-white border border-white/20 rounded-bl-none"
                                )}>
                                    {msg.image && (
                                        <div className="mb-2">
                                            <img
                                                src={msg.image}
                                                alt="Attached content"
                                                className="max-w-full max-h-[200px] rounded border border-white/20"
                                            />
                                        </div>
                                    )}
                                    {msg.content}

                                    {/* Source Citations */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                                            {msg.sources.map((source, sIdx) => (
                                                <span
                                                    key={sIdx}
                                                    className="inline-flex items-center px-2 py-1 rounded bg-black/20 border border-white/10 text-[10px] text-white/60 hover:bg-black/40 transition-colors"
                                                >
                                                    📄 {source.filename} <span className="opacity-50 ml-1">(Pg {source.page})</span>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* System Status Line - Professional Command Center Style */}
                        {isThinking && (
                            <div className="flex justify-start mb-4 pl-1">
                                <div className="flex items-center gap-3 bg-black/20 p-2 pr-4 rounded-full border border-white/5 backdrop-blur-sm">
                                    {/* Tech Spinner + Logo */}
                                    <div className="relative w-8 h-8 flex items-center justify-center">
                                        <div className="scale-[0.4]">
                                            <MiniLogo size="sm" />
                                        </div>
                                        {/* Outer Ring Spinner */}
                                        <div className={clsx(
                                            "absolute inset-0 border-[3px] border-t-transparent rounded-full animate-spin",
                                            isAdmin ? "border-cyan-500/50" : "border-white/50"
                                        )} />
                                        {/* Inner Ring Pulse */}
                                        <div className={clsx(
                                            "absolute inset-1 border border-b-transparent rounded-full animate-pulse",
                                            isAdmin ? "border-cyan-300/30" : "border-white/30"
                                        )} />
                                    </div>

                                    {/* Status Text - Monospace & Technical */}
                                    <div className="flex flex-col justify-center">
                                        <div className={clsx(
                                            "font-mono text-xs font-bold tracking-widest uppercase flex items-center shadow-black drop-shadow-md",
                                            isAdmin ? "text-cyan-400" : "text-white"
                                        )}>
                                            <span className="opacity-50 mr-2 text-[10px]">System::Status {">"}</span>
                                            {thinkingStep || "PROCESSING_REQUEST..."}
                                            <span className="animate-pulse ml-1 inline-block bg-current w-2 h-3 align-middle"></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Removed messagesEndRef div as we scroll container directly */}
                    </div>

                    {/* Image Preview Area */}
                    {chatImage && (
                        <div className="relative mb-2 w-fit group">
                            <img src={chatImage} alt="Preview" className="h-20 rounded border border-cyan-500/50" />
                            <button
                                onClick={() => setChatImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="flex gap-2 items-end">
                        {/* Image Upload Button */}
                        <input
                            type="file"
                            accept="image/*"
                            ref={chatImageInputRef}
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                        setChatImage(reader.result as string);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            }}
                        />
                        <button
                            onClick={() => chatImageInputRef.current?.click()}
                            className={clsx(
                                "p-3 h-[46px] flex items-center justify-center border transition-all",
                                isAdmin
                                    ? "bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-500/30 text-cyan-300"
                                    : "bg-white/10 hover:bg-white/20 border-white/30 text-white"
                            )}
                            title="Upload Image"
                        >
                            📷
                        </button>

                        <div className="flex-1">
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onPaste={(e) => {
                                    const items = e.clipboardData.items;
                                    for (let i = 0; i < items.length; i++) {
                                        if (items[i].type.indexOf("image") !== -1) {
                                            e.preventDefault();
                                            const blob = items[i].getAsFile();
                                            if (blob) {
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    setChatImage(event.target?.result as string);
                                                };
                                                reader.readAsDataURL(blob);
                                            }
                                        }
                                    }
                                }}
                                placeholder="Transmit query..."
                                className={isAdmin ? "" : "border-white/30 focus:border-white placeholder:text-white/50"}
                                containerClassName="mb-0"
                            />
                        </div>
                        <button
                            onClick={isThinking ? handleStopGeneration : handleSendMessage}
                            className={clsx(
                                "px-6 h-[46px] text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap border flex items-center justify-center gap-2",
                                isThinking
                                    ? "bg-red-500/20 hover:bg-red-500/40 border-red-400/50 text-red-300"
                                    : isAdmin
                                        ? "bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-400/50 text-cyan-300"
                                        : "bg-white/10 hover:bg-white/20 border-white/50 text-white"
                            )}
                        >
                            {isThinking ? (
                                <>
                                    <span className="w-3 h-3 bg-current"></span>
                                    Stop
                                </>
                            ) : (
                                "Send"
                            )}
                        </button>
                    </div>
                </section>
            </div >
        </main >
    );
}
