"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const HexagonGrid = () => (
    <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='104' viewBox='0 0 60 104' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill-opacity='0' stroke='%2300f3ff' stroke-width='1'/%3E%3Cpath d='M30 52l25.98 15v30L30 112 4.02 97v-30z' fill-opacity='0' stroke='%2300f3ff' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 104px",
        }}
    >
        <motion.div
            className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent"
            animate={{
                backgroundPositionY: ["0px", "104px"],
            }}
            transition={{
                repeat: Infinity,
                ease: "linear",
                duration: 20,
            }}
            style={{
                backgroundAttachment: "fixed", // Parallax feel
            }}
        />
    </div>
);

const BinaryStream = ({ x, speed, delay }: { x: number; speed: number; delay: number }) => {
    return (
        <motion.div
            className="absolute text-cyan-500/20 text-xs font-mono writing-vertical-rl select-none pointer-events-none"
            style={{ left: `${x}%`, top: -100 }}
            animate={{
                top: ["-20%", "120%"],
                opacity: [0, 1, 0],
            }}
            transition={{
                duration: speed,
                repeat: Infinity,
                delay: delay,
                ease: "linear",
            }}
        >
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i} className="my-1">
                    {Math.random() > 0.5 ? "1" : "0"}
                </div>
            ))}
        </motion.div>
    );
};

export default function Background() {
    const [streams, setStreams] = useState<Array<{ id: number; x: number; speed: number; delay: number }>>([]);

    useEffect(() => {
        // Generate random streams only on client to avoid hydration mismatch
        const newStreams = Array.from({ length: 15 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100,
            speed: 10 + Math.random() * 10,
            delay: Math.random() * 5,
        }));
        setStreams(newStreams);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[var(--background)]">
            {/* Deep Void Gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--background)_0%,_#000000_100%)] opacity-80" />

            {/* Moving Grid */}
            <motion.div
                className="absolute inset-0 opacity-10"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='104' viewBox='0 0 60 104' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='none' stroke='%2300f3ff' stroke-width='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 104px",
                }}
                animate={{
                    backgroundPositionY: ["0px", "104px"],
                }}
                transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 15,
                }}
            />

            {/* Binary Streams */}
            {streams.map((stream) => (
                <BinaryStream key={stream.id} {...stream} />
            ))}

            {/* Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(transparent_40%,_#000000_100%)]" />
        </div>
    );
}
