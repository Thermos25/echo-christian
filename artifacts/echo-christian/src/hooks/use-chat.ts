import { useState, useRef, useEffect, useCallback } from "react";

export type MessageRole = "user" | "assistant" | "system";

export interface StreamMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface UseChatOptions {
  onResponseComplete?: (content: string) => void;
}

type LocalMessage = {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
};

type LocalConversation = {
  id: number;
  title: string;
  messages: LocalMessage[];
};

const STORAGE_KEY = "echo-christian-local-conversation";

function createInitialConversation(): LocalConversation {
  return {
    id: 1,
    title: "Echo Christian",
    messages: [
      {
        id: 1,
        conversationId: 1,
        role: "assistant",
        content:
          "Ich bin da. Schreib mir einfach, was gerade in dir arbeitet. Du musst es nicht perfekt formulieren.",
        createdAt: new Date().toISOString(),
      },
    ],
  };
}

function loadConversation(): LocalConversation {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignorieren und neu starten
  }
  return createInitialConversation();
}


async function createEchoResponse(input: string, history: LocalMessage[]): Promise<string> {
  const response = await fetch("/.netlify/functions/echo", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: input,
      history: history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Echo konnte gerade keine Antwort erzeugen.");
  }

  return data.reply;
}

export function useChat({ onResponseComplete }: UseChatOptions = {}) {
  const [activeConversation, setActiveConversation] = useState<LocalConversation>(() =>
    loadConversation()
  );
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const onResponseCompleteRef = useRef(onResponseComplete);
  onResponseCompleteRef.current = onResponseComplete;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeConversation));
  }, [activeConversation]);

  const startNewConversation = useCallback(() => {
    const fresh = createInitialConversation();
    setActiveConversation(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: LocalMessage = {
      id: Date.now(),
      conversationId: 1,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const responseText = await createEchoResponse(content, activeConversation.messages);

    setActiveConversation((old) => ({
      ...old,
      messages: [...old.messages, userMessage],
    }));

    setIsStreaming(true);
    setStreamedContent("");

    let current = "";

    for (const char of responseText) {
      current += char;
      setStreamedContent(current);
      await new Promise((resolve) => setTimeout(resolve, 8));
    }

    const assistantMessage: LocalMessage = {
      id: Date.now() + 1,
      conversationId: 1,
      role: "assistant",
      content: responseText,
      createdAt: new Date().toISOString(),
    };

    setActiveConversation((old) => ({
      ...old,
      messages: [...old.messages, assistantMessage],
    }));

    onResponseCompleteRef.current?.(responseText);

    setIsStreaming(false);
    setStreamedContent("");
  }, []);

  return {
    activeConversation,
    activeConversationId: 1,
    startNewConversation,
    sendMessage,
    streamedContent,
    isStreaming,
    isLoading: false,
  };
}
