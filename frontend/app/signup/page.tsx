"use client";

import Background from "@/components/Background";
import Input from "@/components/Input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";

export default function SignUp() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Mock API call / Registration delay
        setTimeout(() => {
            // Store user info in sessionStorage
            sessionStorage.setItem("userRole", "user");
            sessionStorage.setItem("userFirstName", formData.firstName);
            sessionStorage.setItem("userLastName", formData.lastName);
            sessionStorage.setItem("userEmail", formData.email);
            router.push("/device-selection");
        }, 1500);
    };

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4 bg-transparent overflow-hidden">
            <Background />

            <div className="relative z-10 w-full max-w-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative backdrop-blur-sm bg-black/30 border border-cyan-500/30 p-8 rounded-lg shadow-[0_0_30px_rgba(0,243,255,0.1)]"
                >
                    {/* Glowing borders */}
                    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70" />
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-70" />

                    <h1 className="text-2xl font-bold text-center mb-8 text-cyan-400 tracking-[0.2em] uppercase shadow-cyan-500/50 drop-shadow-[0_0_10px_rgba(0,243,255,0.5)]">
                        Register
                    </h1>

                    <form onSubmit={handleRegister} className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} />
                            <Input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
                        </div>
                        <Input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} />
                        <Input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} />
                        <Input name="confirmPassword" type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} />

                        <div className="mt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold py-4 tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-[1.02] active:scale-[0.98] uppercase disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                                        Processing...
                                    </span>
                                ) : (
                                    "Confirm"
                                )}
                                {/* Scan line effect on hover */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent -translate-x-full group-hover:animate-scan-fast" />
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => router.push("/")}
                            className="text-xs text-cyan-500/50 hover:text-cyan-400 uppercase tracking-widest transition-colors"
                        >
                            Return to Login
                        </button>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
