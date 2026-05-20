import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type EchoAvatarProps = {
  active?: boolean;
};

export function EchoAvatar({ active = false }: EchoAvatarProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      video.playbackRate = 1.03;
      video.play().catch(() => {});
    } else {
      video.pause();

      // Zurück auf ein ruhiges Anfangsbild, damit er nicht mit offenem Mund stehen bleibt.
      try {
        video.currentTime = 0;
      } catch {
        // ignorieren
      }
    }
  }, [active]);

  return (
    <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48">
      {/* Outer pulsing ring */}
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/30"
        animate={{
          scale: active ? [1, 1.15, 1] : 1,
          opacity: active ? [0.3, 0.08, 0.3] : 0.22,
        }}
        transition={{
          duration: 3,
          repeat: active ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Spinning dashed ring */}
      <motion.div
        className="absolute inset-3 rounded-full border-2 border-dashed border-primary/40"
        animate={{ rotate: active ? 360 : 0 }}
        transition={{
          duration: 18,
          repeat: active ? Infinity : 0,
          ease: "linear",
        }}
      />

      {/* Glow halo behind avatar */}
      <motion.div
        className="absolute inset-6 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(59,130,246,0.08) 60%, transparent 100%)",
          filter: "blur(8px)",
        }}
        animate={{
          opacity: active ? [0.6, 1, 0.6] : 0.55,
          scale: active ? [1, 1.08, 1] : 1,
        }}
        transition={{
          duration: 3,
          repeat: active ? Infinity : 0,
          ease: "easeInOut",
        }}
      />

      {/* Heiler Echo video circle */}
      <motion.div
        className="relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-black"
        style={{
          border: active
            ? "2px solid rgba(96,165,250,0.9)"
            : "2px solid rgba(59,130,246,0.6)",
          boxShadow: active
            ? "0 0 28px rgba(59,130,246,0.7), 0 0 80px rgba(59,130,246,0.28), inset 0 0 24px rgba(59,130,246,0.12)"
            : "0 0 20px rgba(59,130,246,0.45), 0 0 60px rgba(59,130,246,0.18), inset 0 0 20px rgba(59,130,246,0.1)",
        }}
      >
        <video
          ref={videoRef}
          src="/heiler-echo-avatar.mp4?v=sync-text-1"
          className="w-full h-full object-cover object-top"
          muted
          loop
          playsInline
          preload="auto"
        />
      </motion.div>
    </div>
  );
}
