import { motion } from "framer-motion";

export function EchoAvatar() {
  return (
    <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48">
      {/* Outer pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/30"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.08, 0.3],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Spinning dashed ring */}
      <motion.div
        className="absolute inset-3 rounded-full border-2 border-dashed border-primary/40"
        animate={{ rotate: 360 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      {/* Glow halo behind photo */}
      <motion.div
        className="absolute inset-6 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.08) 60%, transparent 100%)",
          filter: "blur(8px)",
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Photo circle */}
      <motion.div
        className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden"
        style={{
          border: "2px solid rgba(59,130,246,0.6)",
          boxShadow:
            "0 0 20px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.2), inset 0 0 20px rgba(59,130,246,0.1)",
        }}
        animate={{
          boxShadow: [
            "0 0 20px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.2), inset 0 0 20px rgba(59,130,246,0.1)",
            "0 0 30px rgba(59,130,246,0.8), 0 0 80px rgba(59,130,246,0.35), inset 0 0 30px rgba(59,130,246,0.15)",
            "0 0 20px rgba(59,130,246,0.5), 0 0 60px rgba(59,130,246,0.2), inset 0 0 20px rgba(59,130,246,0.1)",
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img
          src="/echo-avatar.png"
          alt="ECHO CHRISTIAN"
          className="w-full h-full object-cover object-top"
          style={{ filter: "brightness(1.05) contrast(1.05) saturate(0.9)" }}
        />
      </motion.div>
    </div>
  );
}
