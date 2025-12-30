"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import ProfileModal from "./ProfileModal";

interface UserMenuProps {
    role: string;
}

export default function UserMenu({ role }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [userInfo, setUserInfo] = useState({ firstName: "", lastName: "", email: "" });
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        // Load user info from sessionStorage
        setUserInfo({
            firstName: sessionStorage.getItem("userFirstName") || "",
            lastName: sessionStorage.getItem("userLastName") || "",
            email: sessionStorage.getItem("userEmail") || "",
        });
    }, []);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleLogout = () => {
        sessionStorage.clear();
        router.push("/");
    };

    const handleOpenProfile = () => {
        setIsOpen(false);
        setIsProfileOpen(true);
    };

    const displayName = userInfo.firstName && userInfo.lastName
        ? `${userInfo.firstName} ${userInfo.lastName}`
        : userInfo.firstName || "No Name";

    const displayEmail = userInfo.email || "No Email";
    const displayInitial = userInfo.firstName ? userInfo.firstName.charAt(0).toUpperCase() : "?";

    return (
        <>
            <div className="relative" ref={menuRef}>
                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 border border-white/30 flex items-center justify-center text-white font-bold text-sm">
                        {displayInitial}
                    </div>
                    <span className="text-sm text-white font-medium hidden sm:block">{displayName}</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-4 w-4 text-white/70 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-72 bg-black/95 backdrop-blur-xl border border-cyan-500/30 rounded-lg shadow-[0_10px_40px_rgba(0,243,255,0.3)] overflow-hidden z-[100]"
                        >
                            {/* User Info Header */}
                            <div className="p-4 border-b border-cyan-500/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-xl">
                                        {displayInitial}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold truncate">{displayName}</p>
                                        <p className="text-cyan-400/70 text-xs truncate">{displayEmail}</p>
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-[10px] uppercase tracking-wider rounded">
                                            {role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Menu Items */}
                            <div className="py-2">
                                <MenuItem
                                    icon="👤"
                                    label="Profile Information"
                                    onClick={handleOpenProfile}
                                />
                                <MenuItem
                                    icon="🔒"
                                    label="Change Password"
                                    onClick={() => alert("Change Password feature coming soon!")}
                                />
                            </div>

                            {/* Logout */}
                            <div className="border-t border-cyan-500/20 p-2">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-md transition-colors text-sm"
                                >
                                    <span>🚪</span>
                                    <span className="uppercase tracking-wider font-medium">Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Profile Modal */}
            <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
        </>
    );
}

function MenuItem({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 py-3 text-white/80 hover:bg-cyan-500/10 hover:text-white transition-colors text-sm"
        >
            <span>{icon}</span>
            <span className="uppercase tracking-wider">{label}</span>
        </button>
    );
}
