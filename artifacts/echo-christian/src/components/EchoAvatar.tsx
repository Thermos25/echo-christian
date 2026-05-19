import React from "react";
import { motion } from "framer-motion";

export function EchoAvatar() {
  return (
    <div className="relative flex items-center justify-center w-24 h-24 sm:w-32 sm:h-32">
      {/* Outer pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/30"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Middle spinning dashed ring */}
      <motion.div
        className="absolute inset-2 rounded-full border-2 border-dashed border-primary/40"
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      {/* Inner core */}
      <motion.div
        className="absolute inset-6 rounded-full bg-primary/20 blur-md"
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Center glowing dot */}
      <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_15px_10px_rgba(59,130,246,0.8)] z-10" />
    </div>
  );
}
