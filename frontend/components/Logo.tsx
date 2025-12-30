"use client";

import { motion } from "framer-motion";

export default function Logo() {
    return (
        <div className="relative z-10 flex justify-center py-10">
            <div className="relative">
                <motion.h1
                    className="text-9xl font-black text-white tracking-tighter select-none"
                    style={{
                        textShadow:
                            "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(0, 243, 255, 0.6)",
                    }}
                    animate={{
                        opacity: [1, 0.9, 1],
                        textShadow: [
                            "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(0, 243, 255, 0.6)",
                            "0 0 30px rgba(255, 255, 255, 1), 0 0 60px rgba(0, 243, 255, 0.8)",
                            "0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(0, 243, 255, 0.6)",
                        ],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                >
                    O/
                </motion.h1>

                {/* Glitch Layer 1 - Cyan Shift */}
                <motion.div
                    className="absolute inset-0 text-cyan-400 mix-blend-screen pointer-events-none"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{
                        x: [0, -3, 3, -1, 0],
                        opacity: [0, 0.8, 0],
                        skewX: [0, 10, -10, 0],
                    }}
                    transition={{
                        duration: 0.2,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 5 + 2,
                    }}
                >
                    <span className="text-9xl font-black tracking-tighter">O/</span>
                </motion.div>

                {/* Glitch Layer 2 - Purple Shift */}
                <motion.div
                    className="absolute inset-0 text-purple-500 mix-blend-screen pointer-events-none"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{
                        x: [0, 3, -3, 1, 0],
                        opacity: [0, 0.8, 0],
                        skewY: [0, 5, -5, 0],
                    }}
                    transition={{
                        duration: 0.25,
                        repeat: Infinity,
                        repeatDelay: Math.random() * 5 + 3,
                    }}
                >
                    <span className="text-9xl font-black tracking-tighter">O/</span>
                </motion.div>
            </div>
        </div>
    );
}
