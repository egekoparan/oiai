"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import clsx from "clsx";

interface ToastProps {
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
    onClose: () => void;
}

export default function Toast({ message, type, isVisible, onClose }: ToastProps) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(onClose, 3000);
            return () => clearTimeout(timer);
        }
    }, [isVisible, onClose]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className={clsx(
                        "fixed bottom-8 right-8 px-6 py-4 rounded-lg shadow-lg backdrop-blur-md border z-50",
                        type === "success" && "bg-green-500/10 border-green-500/50 text-green-400",
                        type === "error" && "bg-red-500/10 border-red-500/50 text-red-400",
                        type === "info" && "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                    )}
                >
                    <div className="flex items-center gap-3">
                        {/* Icon */}
                        {type === "success" && <span>✓</span>}
                        {type === "error" && <span>!</span>}
                        {type === "info" && <span>ℹ</span>}

                        <span className="font-bold tracking-wide uppercase text-xs">{message}</span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
