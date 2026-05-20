import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Terminal, Volume2, VolumeX, Loader2, Mic, MicOff } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useTts } from "@/hooks/use-tts";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { EchoAvatar } from "@/components/EchoAvatar";
import { Button } from "@/components/ui/button";


type StoredUpload = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};

const ECHO_UPLOAD_STORAGE_KEY = "echo-christian-uploaded-files";

const readStoredUploads = (): StoredUpload[] => {
  try {
    const saved = localStorage.getItem(ECHO_UPLOAD_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const saveStoredUploads = (files: StoredUpload[]) => {
  try {
    localStorage.setItem(ECHO_UPLOAD_STORAGE_KEY, JSON.stringify(files));
  } catch {
    console.warn("Uploads konnten nicht lokal gespeichert werden.");
  }
};

const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
};

export default function ChatPage() {
  const { speak, stop: stopTts, state: ttsState, playingId } = useTts();

  const [echoClock, setEchoClock] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setEchoClock(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formattedTime = echoClock.toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedDate = echoClock.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });



  const avatarVideoRef = useRef<HTMLVideoElement | null>(null);
  const centerAvatarVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const videos = [
      avatarVideoRef.current,
      centerAvatarVideoRef.current,
    ].filter(Boolean) as HTMLVideoElement[];

    for (const video of videos) {
      if (ttsState === "playing") {
        video.playbackRate = 1.08;
        video.play().catch(() => {});
      } else if (ttsState === "loading") {
        video.playbackRate = 0.65;
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }, [ttsState]);



  const [autoSpeak, setAutoSpeak] = useState(true);
  const autoSpeakRef = useRef(true);
  autoSpeakRef.current = autoSpeak;

  const handleResponseComplete = useCallback((content: string) => {
    if (autoSpeakRef.current) {
      speak(content, "auto");
    }
  }, [speak]);

  const {
    activeConversation,
    startNewConversation,
    sendMessage,
    streamedContent,
    isStreaming,
    isLoading
  } = useChat({ onResponseComplete: handleResponseComplete });

  useEffect(() => {
    const video = avatarVideoRef.current;
    if (!video) return;

    const echoIsActive = isStreaming || ttsState === "loading" || ttsState === "playing";

    if (ttsState === "playing") {
      video.playbackRate = 1.08;
      video.play().catch(() => {});
    } else if (echoIsActive) {
      video.playbackRate = 0.72;
      video.play().catch(() => {});
    } else {
      // Nicht auf Anfang springen, nur natürlich stehen bleiben.
      video.pause();
    }
  }, [isStreaming, ttsState]);


  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<StoredUpload[]>(() => readStoredUploads());
  const [uploadNotice, setUploadNotice] = useState("");

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFilesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const maxSizeMb = 8;
    const acceptedFiles = files.filter((file) => file.size <= maxSizeMb * 1024 * 1024);

    if (acceptedFiles.length !== files.length) {
      setUploadNotice(`Einige Dateien waren größer als ${maxSizeMb} MB und wurden nicht gespeichert.`);
    } else {
      setUploadNotice("");
    }

    const storedFiles: StoredUpload[] = await Promise.all(
      acceptedFiles.map(async (file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: await fileToDataUrl(file),
        createdAt: new Date().toISOString(),
      }))
    );

    setSelectedFiles((prev) => {
      const next = [...prev, ...storedFiles];
      saveStoredUploads(next);
      return next;
    });

    event.target.value = "";
  };

  const removeSelectedFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, index) => index !== indexToRemove);
      saveStoredUploads(next);
      return next;
    });
  };

  const inputRef2 = useRef(input);
  inputRef2.current = input;

  const { state: micState, isSupported: micSupported, toggle: toggleMic, stop: stopMic } = useSpeechRecognition({
    lang: "de-DE",
    onTranscript: useCallback((text: string, isFinal: boolean) => {
      if (isFinal) {
        setInterimText("");
        setInput(prev => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${text.trim()}` : text.trim();
        });
      } else {
        setInterimText(text);
      }
    }, []),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamedContent]);


  const scheduleSpeechSubmit = (spokenText: string) => {
    const cleanText = spokenText.trim();
    if (!cleanText || isStreaming) return;

    if (speechSubmitTimerRef.current) {
      clearTimeout(speechSubmitTimerRef.current);
    }

    lastSpeechTextRef.current = cleanText;
    setInput("");
    setInterimText("");
    setAutoSpeak(true);

    // Natürliches Gespräch: sofort senden, sobald die Spracheingabe final erkannt wurde.
    sendMessage(cleanText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    if (micState === "listening") stopMic();
    setInterimText("");
    sendMessage(text);
    setInput("");
  };

  const toggleAutoSpeak = () => {
    if (autoSpeak && ttsState === "playing") stopTts();
    setAutoSpeak(v => !v);
  };

  const displayValue = interimText
    ? `${input}${input ? " " : ""}${interimText}`
    : input;

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-background text-foreground overflow-hidden">
      {/* Background ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
      </div>

      {/* Header */}
      <header className="w-full max-w-4xl px-6 py-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center rounded-full glass-panel glow-border">
            <Terminal className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-mono font-bold tracking-widest glow-text uppercase">Echo Christian</h1>
            <p className="text-xs text-primary/70 tracking-widest uppercase">Your AI Twin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleAutoSpeak}
            data-testid="button-toggle-autospeak"
            title={autoSpeak ? "Auto-speak on" : "Auto-speak off"}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-panel border transition-all duration-200"
            style={{
              borderColor: autoSpeak ? "rgba(59,130,246,0.5)" : "rgba(59,130,246,0.15)",
              color: autoSpeak ? "rgba(59,130,246,1)" : "rgba(59,130,246,0.35)",
              boxShadow: autoSpeak ? "0 0 10px rgba(59,130,246,0.2)" : "none",
            }}
          >
            {autoSpeak ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-mono uppercase tracking-wider">
              {autoSpeak ? "Voice On" : "Voice Off"}
            </span>
          </button>
          <Button
            variant="outline"
            onClick={startNewConversation}
            className="glass-panel border-primary/30 hover:border-primary/60 text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-300"
            data-testid="button-new-conversation"
          >
            <Plus className="w-4 h-4 mr-2" />
            Initialize Sync
          </Button>
        </div>
      </header>

      {/* Main Chat Area */}


      <div
        data-echo-floating-avatar
        className="fixed top-4 right-4 z-50 w-[172px] sm:w-[225px] rounded-3xl border border-blue-400/40 bg-slate-950/88 p-3 shadow-[0_0_38px_rgba(59,130,246,0.38)] backdrop-blur-xl"
      >
        <div className="relative mx-auto mb-2 aspect-[3/4] w-full overflow-hidden rounded-2xl border border-blue-300/50 bg-black shadow-[0_0_32px_rgba(59,130,246,0.45)]">
          <video
            ref={avatarVideoRef}
            src="/echo-avatar-speaking.mp4"
            className="h-full w-full object-cover"
            muted
            loop
            playsInline
            preload="metadata"
          />

          <div
            className={
              ttsState === "playing" || isStreaming
                ? "absolute inset-0 rounded-2xl ring-4 ring-blue-400/50 animate-pulse"
                : "absolute inset-0 rounded-2xl ring-1 ring-blue-500/20"
            }
          />

          {ttsState === "playing" && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="block w-1 rounded-full bg-blue-300/90 animate-pulse"
                  style={{
                    height: `${8 + (i % 3) * 7}px`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-blue-200/85">
            Echo Christian
          </div>
          <div className="mt-1 text-[11px] text-blue-100/75">
            {ttsState === "playing"
              ? "spricht gerade..."
              : ttsState === "loading"
              ? "bereitet Stimme vor..."
              : "wartet ruhig"}
          </div>
        </div>
      </div>


      <div
        data-echo-digital-clock
        className="fixed left-4 top-4 z-50 hidden w-[230px] rounded-3xl border border-blue-400/35 bg-slate-950/85 p-4 text-center shadow-[0_0_32px_rgba(59,130,246,0.28)] backdrop-blur-xl lg:block"
      >
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.9)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-blue-200/70">
            Systemzeit
          </span>
        </div>

        <div className="font-mono text-3xl font-semibold tracking-widest text-blue-100 drop-shadow-[0_0_12px_rgba(96,165,250,0.65)]">
          {formattedTime}
        </div>

        <div className="mt-2 border-t border-blue-400/15 pt-2 text-xs leading-relaxed text-blue-100/65">
          {formattedDate}
        </div>

        <div className="mx-auto mt-4 h-px w-full bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

        <div className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-950/35 px-3 py-3 shadow-[inset_0_0_18px_rgba(59,130,246,0.08)]">
          <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-blue-300/45">
            Sprecher
          </div>

          <div className="mt-1 text-center font-mono text-sm font-semibold uppercase tracking-[0.18em] text-blue-100 drop-shadow-[0_0_10px_rgba(96,165,250,0.45)]">
            Echo Christian
          </div>

          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-blue-200/50">
              online
            </span>
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-4xl px-4 sm:px-6 flex flex-col relative z-10 overflow-hidden pb-4 pt-32 sm:pt-0 pt-40 sm:pt-0 pt-44 sm:pt-0">

        {/* Avatar */}
        <div className="flex-shrink-0 flex justify-center py-6">
          <div className="relative">
            <EchoAvatar />
            {ttsState === "playing" && (
              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {[0, 1, 2, 3].map(i => (
                  <motion.div
                    key={i}
                    className="w-0.5 rounded-full bg-primary"
                    animate={{ height: ["4px", "12px", "4px"] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto w-full pr-2 pb-2 scrollbar-hide">
          <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto pb-4">

            {!isLoading && activeConversation?.messages?.length === 0 && (
              <div className="flex justify-center items-center h-40 opacity-50">
                <p className="font-mono text-sm tracking-widest uppercase text-center">Neural link established. Awaiting input.</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {activeConversation?.messages?.filter(m => m.role !== "system").map((msg) => {
                const msgId = String(msg.id);
                const isThisPlaying = playingId === msgId && ttsState === "playing";
                const isThisLoading = playingId === msgId && ttsState === "loading";

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[75%] p-4 ${
                        msg.role === "user"
                          ? "bg-blue-600/35 border border-blue-400/60 text-white rounded-2xl rounded-tr-none shadow-[0_0_18px_rgba(59,130,246,0.22)]"
                          : "glass-panel rounded-2xl rounded-tl-none border-primary/20 text-foreground/90 leading-relaxed font-sans"
                      }`}
                    >
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-2 opacity-50">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-mono uppercase tracking-wider">ECHO</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {msg.role === "assistant" && (
                        <div className="mt-3 pt-2 border-t border-primary/10">
                          <button
                            onClick={() =>
                              isThisPlaying ? stopTts() : speak(msg.content, msgId)
                            }
                            disabled={ttsState === "loading" && !isThisLoading}
                            data-testid={`button-speak-${msg.id}`}
                            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider transition-all duration-200 disabled:opacity-30 hover:opacity-100"
                            style={{
                              color: isThisPlaying ? "rgba(59,130,246,1)" : "rgba(59,130,246,0.45)",
                            }}
                          >
                            {isThisLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : isThisPlaying ? (
                              <VolumeX className="w-3 h-3" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                            {isThisLoading ? "Stimme wird erzeugt..." : isThisPlaying ? "Stopp" : "Sprechen"}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Streaming Message */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full justify-start"
              >
                <div className="max-w-[85%] sm:max-w-[75%] p-4 glass-panel rounded-2xl rounded-tl-none border-primary/40 shadow-[0_0_15px_rgba(59,130,246,0.15)] text-foreground/90 leading-relaxed font-sans">
                  <div className="flex items-center gap-2 mb-2 opacity-80">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary">Synthesizing...</span>
                  </div>
                  <div className="whitespace-pre-wrap">
                    {streamedContent}
                    <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="w-full max-w-3xl mx-auto mt-4">
          <input
            ref={fileInputRef}
            data-echo-file-upload
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={handleFilesChange}
          />

          {uploadNotice && (
            <div
              data-echo-upload-notice
              className="mb-2 rounded-xl border border-amber-400/30 bg-amber-950/40 px-3 py-2 text-xs text-amber-100"
            >
              {uploadNotice}
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div
              data-echo-upload-saved-hint
              className="mb-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-blue-200/45"
            >
              Dateien lokal gespeichert
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex max-w-full items-center gap-2 rounded-full border border-blue-400/40 bg-blue-950/70 px-3 py-1.5 text-xs text-white shadow-[0_0_14px_rgba(59,130,246,0.18)]"
                >
                  <span className="max-w-[220px] truncate">
                    {file.type.includes("pdf") ? "PDF" : "Bild"} · {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>

                  <button
                    type="button"
                    onClick={() => removeSelectedFile(index)}
                    className="rounded-full px-1 text-blue-200 transition hover:bg-blue-400/20 hover:text-white"
                    title="Datei entfernen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end w-full glass-panel rounded-2xl p-1 transition-all duration-300"
            style={{
              border: micState === "listening"
                ? "1px solid rgba(59,130,246,0.6)"
                : "1px solid rgba(59,130,246,0.2)",
              boxShadow: micState === "listening"
                ? "0 0 25px rgba(59,130,246,0.35), inset 0 0 15px rgba(59,130,246,0.05)"
                : "none",
            }}
          >
            <button
              type="button"
              onClick={openFilePicker}
              disabled={isStreaming}
              data-testid="button-file-upload"
              title="Bild oder PDF hinzufügen"
              className="absolute left-2 bottom-2 z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/35 bg-blue-900/35 text-xl font-light leading-none text-blue-100 shadow-[0_0_12px_rgba(59,130,246,0.18)] transition-all duration-300 hover:border-blue-300/70 hover:bg-blue-800/60 hover:text-white disabled:opacity-40"
            >
              +
            </button>

            <textarea
              ref={inputRef}
              value={displayValue}
              onChange={(e) => {
                setInterimText("");
                setInput(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                micState === "listening"
                  ? "Spreche jetzt..."
                  : "Schreibe oder sprich deine Gedanken..."
              }
              className="w-full max-h-32 min-h-[56px] py-4 pl-14 pr-28 bg-transparent border-none focus:ring-0 resize-none text-white placeholder:text-blue-100/55 font-mono text-base leading-relaxed caret-blue-300"
              style={{
                color: interimText ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.96)",
              }}
              rows={1}
              disabled={isStreaming}
              data-testid="input-chat"
            />

            {/* Button row */}
            <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
              {/* Mic button */}
              {micSupported && (
                <motion.button
                  type="button"
                  onClick={toggleMic}
                  disabled={isStreaming}
                  data-testid="button-mic"
                  title={micState === "listening" ? "Mikrofon stoppen" : "Mikrofon starten"}
                  className="relative h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-40"
                  style={{
                    background: micState === "listening"
                      ? "rgba(59,130,246,0.25)"
                      : "rgba(59,130,246,0.08)",
                    border: micState === "listening"
                      ? "1px solid rgba(59,130,246,0.7)"
                      : "1px solid rgba(59,130,246,0.25)",
                    boxShadow: micState === "listening"
                      ? "0 0 16px rgba(59,130,246,0.5)"
                      : "none",
                    color: micState === "listening"
                      ? "rgba(59,130,246,1)"
                      : "rgba(59,130,246,0.5)",
                  }}
                  animate={micState === "listening" ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                  transition={{ duration: 1.2, repeat: micState === "listening" ? Infinity : 0, ease: "easeInOut" }}
                >
                  {micState === "listening" ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                  {/* Pulse ring when listening */}
                  {micState === "listening" && (
                    <motion.span
                      className="absolute inset-0 rounded-xl"
                      style={{ border: "1px solid rgba(59,130,246,0.5)" }}
                      animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </motion.button>
              )}

              {/* Send button */}
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isStreaming}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:shadow-none transition-all duration-300"
                data-testid="button-submit-chat"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </form>

          {/* Mic status hint */}
          <div className="flex items-center justify-center mt-3 gap-2 opacity-40">
            {micState === "listening" && (
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-0.5 h-2 rounded-full bg-primary"
                    animate={{ height: ["4px", "10px", "4px"] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                  />
                ))}
                <span className="text-[10px] font-mono uppercase tracking-widest ml-1 text-primary" style={{ opacity: 1 }}>
                  Höre zu...
                </span>
              </motion.div>
            )}
            {micState !== "listening" && (
              <span className="text-[10px] font-mono uppercase tracking-widest">End-to-end encrypted neural channel</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
