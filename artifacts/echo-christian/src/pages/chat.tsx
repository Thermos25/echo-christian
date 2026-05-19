import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Terminal, Volume2, VolumeX, Loader2, Mic, MicOff } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { useTts } from "@/hooks/use-tts";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { EchoAvatar } from "@/components/EchoAvatar";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const { speak, stop: stopTts, state: ttsState, playingId } = useTts();

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

  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
      <main className="flex-1 w-full max-w-4xl px-4 sm:px-6 flex flex-col relative z-10 overflow-hidden pb-4">

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
                          ? "bg-primary/20 border border-primary/30 text-primary-foreground rounded-2xl rounded-tr-none"
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
                            {isThisLoading ? "Synthesizing..." : isThisPlaying ? "Stop" : "Speak"}
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
                  : "Transmit your thoughts..."
              }
              className="w-full max-h-32 min-h-[56px] py-4 px-4 bg-transparent border-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm leading-relaxed"
              style={{
                color: interimText ? "rgba(255,255,255,0.45)" : undefined,
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
