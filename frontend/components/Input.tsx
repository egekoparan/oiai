"use client";

import React from "react";
import clsx from "clsx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string; // Standard HTML input placeholder acts as label in the design
    containerClassName?: string;
}

export default function Input({ className, containerClassName, ...props }: InputProps) {
    return (
        <div className={clsx("relative group", containerClassName || "mb-6")}>
            <input
                {...props}
                className={clsx(
                    "w-full bg-transparent border-2 border-cyan-500/30 text-white px-4 py-3 outline-none transition-all duration-300",
                    "placeholder:text-cyan-500/50",
                    "focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,243,255,0.3)]",
                    "hover:border-cyan-500/60",
                    "rounded-sm", // Slight rounding or straight tech edges
                    className
                )}
            />
            {/* Decorative corners or lines could be added here */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
