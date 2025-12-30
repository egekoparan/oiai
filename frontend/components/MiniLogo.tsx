"use client";

import { motion } from "framer-motion";

interface MiniLogoProps {
    size?: "sm" | "md";
}

export default function MiniLogo({ size = "sm" }: MiniLogoProps) {
    const textSize = size === "sm" ? "text-3xl" : "text-5xl";

    return (
        <div className="relative">
            <motion.span
                className={`${textSize} font-black text-white tracking-tighter select-none`}
                style={{
                    textShadow:
                        "0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 243, 255, 0.6)",
                }}
                animate={{
                    opacity: [1, 0.9, 1],
                    textShadow: [
                        "0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 243, 255, 0.6)",
                        "0 0 15px rgba(255, 255, 255, 1), 0 0 30px rgba(0, 243, 255, 0.8)",
                        "0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(0, 243, 255, 0.6)",
                    ],
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                O/
            </motion.span>

            {/* Glitch effect */}
            <motion.span
                className={`absolute inset-0 ${textSize} font-black text-cyan-400 mix-blend-screen pointer-events-none tracking-tighter`}
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{
                    x: [0, -2, 2, 0],
                    opacity: [0, 0.6, 0],
                }}
                transition={{
                    duration: 0.15,
                    repeat: Infinity,
                    repeatDelay: Math.random() * 4 + 2,
                }}
            >
                O/
            </motion.span>
        </div>
    );
}
