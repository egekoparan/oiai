"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Input from "./Input";

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        title: "",
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Load data from sessionStorage
            setFormData({
                firstName: sessionStorage.getItem("userFirstName") || "",
                lastName: sessionStorage.getItem("userLastName") || "",
                email: sessionStorage.getItem("userEmail") || "",
                password: "", // Don't show actual password
                title: sessionStorage.getItem("userTitle") || "",
            });
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = () => {
        setIsSaving(true);

        // Save to sessionStorage
        sessionStorage.setItem("userFirstName", formData.firstName);
        sessionStorage.setItem("userLastName", formData.lastName);
        sessionStorage.setItem("userEmail", formData.email);
        sessionStorage.setItem("userTitle", formData.title);
        if (formData.password) {
            // Only update password if user entered a new one
            sessionStorage.setItem("userPassword", formData.password);
        }

        setTimeout(() => {
            setIsSaving(false);
            onClose();
            // Refresh page to reflect changes
            window.location.reload();
        }, 500);
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
                                    Profile Information
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-cyan-400/70 uppercase tracking-wider mb-1 block">First Name</label>
                                        <Input
                                            name="firstName"
                                            placeholder="First Name"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-cyan-400/70 uppercase tracking-wider mb-1 block">Last Name</label>
                                        <Input
                                            name="lastName"
                                            placeholder="Last Name"
                                            value={formData.lastName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-cyan-400/70 uppercase tracking-wider mb-1 block">Email</label>
                                    <Input
                                        name="email"
                                        type="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs text-cyan-400/70 uppercase tracking-wider mb-1 block">Title / Position</label>
                                    <Input
                                        name="title"
                                        placeholder="e.g. Senior Engineer, Manager..."
                                        value={formData.title}
                                        onChange={handleChange}
                                    />
                                </div>
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
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-6 py-2 bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 rounded transition-colors uppercase tracking-wider text-sm disabled:opacity-50"
                                >
                                    {isSaving ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
