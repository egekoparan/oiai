"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "./Input";

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProductAdded: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AddProductModal({ isOpen, onClose, onProductAdded }: AddProductModalProps) {
    const [productName, setProductName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        if (!productName.trim()) {
            setError("Product name is required");
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const res = await fetch(`${API_URL}/products`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: productName }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.detail || "Failed to create product");
            }

            setProductName("");
            onProductAdded();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-[201] p-4"
                    >
                        <div className="w-full max-w-md bg-black/95 border border-cyan-500/30 rounded-xl shadow-[0_0_50px_rgba(0,243,255,0.2)] overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-cyan-500/20 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white uppercase tracking-widest">
                                    Add New Product
                                </h2>
                                <button
                                    onClick={onClose}
                                    className="text-white/50 hover:text-white transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="text-xs text-cyan-400/70 uppercase tracking-wider mb-2 block">
                                        Product Name
                                    </label>
                                    <Input
                                        placeholder="Enter product name..."
                                        value={productName}
                                        onChange={(e) => setProductName(e.target.value)}
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-sm">{error}</p>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-cyan-500/20 flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2 border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded transition-colors uppercase tracking-wider text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                    className="px-6 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 rounded transition-colors uppercase tracking-wider text-sm disabled:opacity-50"
                                >
                                    {isLoading ? "Creating..." : "Confirm"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
