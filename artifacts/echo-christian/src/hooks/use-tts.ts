import { useState, useRef, useCallback } from "react";

export type TtsState = "idle" | "loading" | "playing" | "error";

export function useTts() {
  const [state, setState] = useState<TtsState>("idle");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, id: string) => {
    if (playingId === id && state === "playing") {
      audioRef.current?.pause();
      audioRef.current = null;
      setState("idle");
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setState("loading");
    setPlayingId(id);

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("TTS request failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setState("playing");
      audio.onended = () => {
        setState("idle");
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      audio.onerror = () => {
        setState("error");
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch {
      setState("error");
      setPlayingId(null);
    }
  }, [playingId, state]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setState("idle");
    setPlayingId(null);
  }, []);

  return { speak, stop, state, playingId };
}
