"use client";

import { useState } from "react";
import Input from "./Input";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useRouter } from "next/navigation";

export default function LoginForm() {
    const [activeTab, setActiveTab] = useState<"LOGIN" | "ADMIN ACCESS">("LOGIN");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const isAdmin = activeTab === "ADMIN ACCESS";
    const accentColor = isAdmin ? "cyan" : "white";

    const handleLogin = () => {
        if (activeTab === "ADMIN ACCESS") {
            sessionStorage.setItem("userRole", "admin");
        } else {
            sessionStorage.setItem("userRole", "user");
        }
        sessionStorage.setItem("userEmail", email || "user@orion.io");
        router.push("/device-selection");
    };

    return (
        <div className="relative w-full max-w-md mx-auto">
            {/* Glass Container */}
            <div
                className={clsx(
                    "relative backdrop-blur-sm bg-black/30 p-8 rounded-lg transition-all duration-300",
                    isAdmin
                        ? "border border-cyan-500/30 shadow-[0_0_30px_rgba(0,243,255,0.1)]"
                        : "border border-white/30 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
                )}
            >
                {/* Glowing borders effect */}
                <div className={clsx(
                    "absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent to-transparent opacity-70 transition-all duration-300",
                    isAdmin ? "via-cyan-500" : "via-white"
                )} />
                <div className={clsx(
                    "absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent to-transparent opacity-70 transition-all duration-300",
                    isAdmin ? "via-cyan-500" : "via-white"
                )} />

                {/* Tabs */}
                <div className={clsx(
                    "flex mb-8 border-b relative transition-all duration-300",
                    isAdmin ? "border-cyan-500/30" : "border-white/30"
                )}>
                    {["LOGIN", "ADMIN ACCESS"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={clsx(
                                "flex-1 pb-3 text-sm font-bold tracking-widest transition-colors relative",
                                activeTab === tab
                                    ? (tab === "ADMIN ACCESS" ? "text-cyan-400" : "text-white")
                                    : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            {tab}
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="activeTab"
                                    className={clsx(
                                        "absolute bottom-0 left-0 right-0 h-0.5 transition-all",
                                        tab === "ADMIN ACCESS"
                                            ? "bg-cyan-400 shadow-[0_0_10px_#00f3ff]"
                                            : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                    )}
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* The 'Sign Up' Button */}
                <button
                    onClick={() => router.push("/signup")}
                    className={clsx(
                        "w-full mb-8 py-3 font-bold tracking-widest transition-all uppercase text-sm rounded-sm border",
                        isAdmin
                            ? "border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                            : "border-white/50 text-white hover:bg-white/10"
                    )}>
                    Sign Up
                </button>

                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                    <Input
                        placeholder="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={isAdmin ? "" : "border-white/30 focus:border-white placeholder:text-white/50"}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={isAdmin ? "" : "border-white/30 focus:border-white placeholder:text-white/50"}
                    />

                    {/* Remember Me & Forgot Password */}
                    <div className="flex items-center justify-between mt-6 mb-8">
                        <label className="flex items-center cursor-pointer group">
                            <div className={clsx(
                                "relative w-5 h-5 rounded-sm mr-3 transition-colors border",
                                isAdmin ? "border-cyan-500/50 group-hover:border-cyan-400" : "border-white/50 group-hover:border-white"
                            )}>
                                <input type="checkbox" className="peer sr-only" />
                                <div className={clsx(
                                    "absolute inset-0 opacity-0 peer-checked:opacity-100 transition-opacity",
                                    isAdmin ? "bg-cyan-400 shadow-[0_0_10px_#00f3ff]" : "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                )} />
                            </div>
                            <span className={clsx(
                                "text-sm transition-colors uppercase tracking-wider font-semibold",
                                isAdmin ? "text-cyan-700 group-hover:text-cyan-500" : "text-gray-400 group-hover:text-white"
                            )}>Remember Me</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => alert("Forgot Password feature coming soon!")}
                            className={clsx(
                                "text-xs uppercase tracking-widest transition-colors",
                                isAdmin ? "text-cyan-500/50 hover:text-cyan-400" : "text-white/50 hover:text-white"
                            )}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className={clsx(
                            "w-full font-bold py-4 tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-[0.98] uppercase border",
                            isAdmin
                                ? "bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-400 text-cyan-300 hover:shadow-[0_0_30px_rgba(0,243,255,0.4)]"
                                : "bg-white/10 hover:bg-white/20 border-white text-white hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
                        )}>
                        Enter
                    </button>
                </form>
            </div>
        </div>
    );
}

