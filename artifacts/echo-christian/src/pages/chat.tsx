import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Plus, Terminal } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { EchoAvatar } from "@/components/EchoAvatar";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const {
    activeConversation,
    startNewConversation,
    sendMessage,
    streamedContent,
    isStreaming,
    isLoading
  } = useChat();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, streamedContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-background text-foreground overflow-hidden">
      {/* Background ambient effects */}
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
        <Button 
          variant="outline" 
          onClick={startNewConversation}
          className="glass-panel border-primary/30 hover:border-primary/60 text-primary hover:text-primary-foreground hover:bg-primary transition-all duration-300"
          data-testid="button-new-conversation"
        >
          <Plus className="w-4 h-4 mr-2" />
          Initialize Sync
        </Button>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 w-full max-w-4xl px-4 sm:px-6 flex flex-col relative z-10 overflow-hidden pb-4">
        
        {/* Avatar Display */}
        <div className="flex-shrink-0 flex justify-center py-6">
          <EchoAvatar />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto w-full pr-2 pb-2 scrollbar-hide" ref={scrollRef}>
          <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto pb-4">
            
            {!isLoading && activeConversation?.messages?.length === 0 && (
              <div className="flex justify-center items-center h-40 opacity-50">
                <p className="font-mono text-sm tracking-widest uppercase text-center">Neural link established. Awaiting input.</p>
              </div>
            )}

            <AnimatePresence initial={false}>
              {activeConversation?.messages?.filter(m => m.role !== 'system').map((msg) => (
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
                  </div>
                </motion.div>
              ))}
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
                    <span className="text-[10px] font-mono uppercase tracking-wider text-primary">SYNTHESIZING...</span>
                  </div>
                  <div className="whitespace-pre-wrap">{streamedContent}<span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" /></div>
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
            className="relative flex items-end w-full glass-panel rounded-2xl p-1 glow-border focus-within:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-300"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Transmit your thoughts..."
              className="w-full max-h-32 min-h-[56px] py-4 px-4 bg-transparent border-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground font-mono text-sm leading-relaxed"
              rows={1}
              disabled={isStreaming}
              data-testid="input-chat"
            />
            <Button 
              type="submit" 
              size="icon"
              disabled={!input.trim() || isStreaming}
              className="absolute right-2 bottom-2 h-10 w-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(59,130,246,0.4)] disabled:opacity-50 disabled:shadow-none transition-all duration-300"
              data-testid="button-submit-chat"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          <div className="text-center mt-3 opacity-40">
            <span className="text-[10px] font-mono uppercase tracking-widest">End-to-end encrypted neural channel</span>
          </div>
        </div>
      </main>
    </div>
  );
}
