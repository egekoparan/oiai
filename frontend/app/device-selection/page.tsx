"use client";

import Background from "@/components/Background";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import AddProductModal from "@/components/AddProductModal";
import Input from "@/components/Input";
import clsx from "clsx";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Product {
    id: number;
    name: string;
}

export default function DeviceSelection() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isEditMode, setIsEditMode] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<Product | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteSteps, setDeleteSteps] = useState<string[]>([]);

    useEffect(() => {
        const role = sessionStorage.getItem("userRole");
        setIsAdmin(role === "admin");
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch(`${API_URL}/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
            setProducts([{ id: 1, name: "G9" }, { id: 2, name: "C3" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeviceSelect = (product: Product) => {
        if (isEditMode) return;
        sessionStorage.setItem("selectedProductId", product.id.toString());
        sessionStorage.setItem("selectedProductName", product.name);
        router.push("/dashboard");
    };

    const handleDeleteProduct = async (product: Product) => {
        // Start delete progress
        setDeleteSteps([]);
        setIsDeleting(true);

        const progressSteps = [
            "Deleting associated documents...",
            "Removing embeddings from vector store...",
            "Cleaning database records...",
        ];

        let stepIndex = 0;
        const stepInterval = setInterval(() => {
            if (stepIndex < progressSteps.length) {
                setDeleteSteps(prev => [...prev, progressSteps[stepIndex]]);
                stepIndex++;
            }
        }, 600);

        try {
            const res = await fetch(`${API_URL}/products/${product.id}`, {
                method: "DELETE",
            });

            clearInterval(stepInterval);

            if (res.ok) {
                setDeleteSteps(prev => [...prev, "✓ Product deleted successfully!"]);
                setTimeout(() => {
                    setIsDeleting(false);
                    setDeleteConfirm(null);
                    fetchProducts();
                }, 1000);
            } else {
                setDeleteSteps(prev => [...prev, "✗ Failed to delete product!"]);
                setTimeout(() => {
                    setIsDeleting(false);
                }, 1000);
            }
        } catch (error) {
            clearInterval(stepInterval);
            console.error("Failed to delete product:", error);
            setDeleteSteps(prev => [...prev, "✗ Connection error!"]);
            setTimeout(() => {
                setIsDeleting(false);
            }, 1000);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-transparent overflow-hidden">
            <Background />

            <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                        "text-4xl md:text-5xl font-bold text-center mb-8 text-transparent bg-clip-text tracking-widest uppercase",
                        isAdmin
                            ? "bg-gradient-to-b from-white to-cyan-400"
                            : "bg-gradient-to-b from-white to-gray-400"
                    )}
                >
                    Select Product
                </motion.h1>

                {/* Search Bar with Edit Button */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="w-full max-w-md mb-8 flex gap-3"
                >
                    <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={clsx(
                            "flex-1",
                            isAdmin ? "" : "border-white/30 focus:border-white placeholder:text-white/50"
                        )}
                    />
                    {isAdmin && (
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={clsx(
                                "px-4 py-3 rounded-sm text-sm font-medium uppercase tracking-wider transition-all whitespace-nowrap",
                                isEditMode
                                    ? "bg-red-500/20 border-2 border-red-500 text-red-400 hover:bg-red-500/30"
                                    : "bg-cyan-500/20 border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/30"
                            )}
                        >
                            {isEditMode ? "Done" : "Edit Products"}
                        </motion.button>
                    )}
                </motion.div>

                {isLoading ? (
                    <div className={isAdmin ? "text-cyan-400 animate-pulse" : "text-white animate-pulse"}>Loading products...</div>
                ) : filteredProducts.length === 0 && searchQuery ? (
                    <div className={isAdmin ? "text-cyan-400/50" : "text-white/50"}>No products found matching "{searchQuery}"</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                        {filteredProducts.map((product) => (
                            <DeviceCard
                                key={product.id}
                                product={product}
                                onClick={() => handleDeviceSelect(product)}
                                isAdmin={isAdmin}
                                isEditMode={isEditMode}
                                onDelete={() => setDeleteConfirm(product)}
                            />
                        ))}

                        {/* Admin: Add Product Button */}
                        {isAdmin && !isEditMode && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowAddModal(true)}
                                className="group relative h-48 w-full bg-black/30 backdrop-blur-md border-2 border-dashed border-cyan-500/40 rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all hover:border-cyan-400 hover:bg-black/50"
                            >
                                <div className="text-5xl text-cyan-400/70 group-hover:text-cyan-300 transition-colors">+</div>
                                <p className="text-cyan-500/50 text-sm mt-2 uppercase tracking-wider">Add Product</p>
                            </motion.button>
                        )}
                    </div>
                )}
            </div>

            <AddProductModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onProductAdded={fetchProducts}
            />

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-black/90 border border-red-500/50 rounded-xl p-6 max-w-md w-full mx-4"
                        >
                            <h3 className="text-xl font-bold text-white mb-4">Delete Product</h3>

                            {isDeleting ? (
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                                        <span className="text-xs uppercase tracking-widest font-bold text-red-400">Deleting</span>
                                    </div>
                                    <p className="text-xs text-white/70 mb-3">Removing {deleteConfirm.name}...</p>
                                    <div className="space-y-1">
                                        {deleteSteps.map((step, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center gap-2 text-xs ${idx === deleteSteps.length - 1
                                                    ? step.startsWith("✓") ? "text-green-400" : step.startsWith("✗") ? "text-red-400" : "text-red-300"
                                                    : "text-red-600"
                                                    }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${idx === deleteSteps.length - 1
                                                    ? step.startsWith("✓") ? "bg-green-400" : step.startsWith("✗") ? "bg-red-400" : "bg-red-400 animate-pulse"
                                                    : "bg-red-600"
                                                    }`} />
                                                {step}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-white/70 mb-6">
                                        Are you sure you want to delete <span className="text-red-400 font-semibold">{deleteConfirm.name}</span>? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-3 justify-end">
                                        <button
                                            onClick={() => setDeleteConfirm(null)}
                                            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleDeleteProduct(deleteConfirm)}
                                            className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500/30 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

interface DeviceCardProps {
    product: Product;
    onClick: () => void;
    isAdmin: boolean;
    isEditMode: boolean;
    onDelete: () => void;
}

function DeviceCard({ product, onClick, isAdmin, isEditMode, onDelete }: DeviceCardProps) {
    return (
        <motion.div
            whileHover={{ scale: isEditMode ? 1 : 1.05 }}
            whileTap={{ scale: isEditMode ? 1 : 0.95 }}
            className="relative"
        >
            {/* Delete Button */}
            {isEditMode && (
                <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-red-500 text-white font-bold text-xl flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/50"
                >
                    −
                </motion.button>
            )}

            <button
                onClick={onClick}
                disabled={isEditMode}
                className={clsx(
                    "group relative h-48 w-full bg-black/40 backdrop-blur-md border rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all",
                    isEditMode && "animate-pulse cursor-default",
                    isAdmin
                        ? "border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_50px_rgba(0,243,255,0.2)]"
                        : "border-white/30 hover:border-white hover:shadow-[0_0_50px_rgba(255,255,255,0.15)]",
                    isEditMode && "border-red-500/50"
                )}
            >
                <div className={clsx(
                    "absolute inset-0 bg-gradient-to-b to-transparent opacity-0 group-hover:opacity-100 transition-opacity",
                    isAdmin ? "from-cyan-500/10" : "from-white/10"
                )} />

                <h2 className={clsx(
                    "text-5xl font-black text-white mb-2 tracking-tighter transition-colors",
                    isAdmin ? "group-hover:text-cyan-400" : "group-hover:text-white"
                )}>
                    {product.name}
                </h2>

                {/* Scanning Line Effect */}
                {!isEditMode && (
                    <div className={clsx(
                        "absolute inset-0 w-full h-1 top-0 group-hover:animate-scan-slow opacity-0 group-hover:opacity-100",
                        isAdmin
                            ? "bg-cyan-400/50 shadow-[0_0_10px_#00f3ff]"
                            : "bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                    )} />
                )}
            </button>
        </motion.div>
    );
}
