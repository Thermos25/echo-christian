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

function createEchoResponse(input: string): string {
  const text = input.trim();

  if (!text) {
    return "Ich bin da. Nimm dir einen Moment. Du musst nichts erzwingen.";
  }

  const lower = text.toLowerCase();

  if (
    lower.includes("hallo") ||
    lower.includes("bist du da") ||
    lower.includes("kannst du mich hören")
  ) {
    return "Ja. Ich bin da. Ruhig, klar und ohne Druck. Was möchtest du mir sagen?";
  }

  if (
    lower.includes("angst") ||
    lower.includes("panik") ||
    lower.includes("überfordert") ||
    lower.includes("müde") ||
    lower.includes("fertig")
  ) {
    return "Dann lass uns langsamer werden. Nicht alles auf einmal. Nur der nächste kleine Schritt zählt. Du musst gerade nichts beweisen.";
  }

  if (
    lower.includes("traurig") ||
    lower.includes("allein") ||
    lower.includes("verzweifelt")
  ) {
    return "Ich höre darin etwas Schweres. Und ich will es nicht kleinreden. Vielleicht geht es gerade nicht darum, sofort eine Lösung zu finden, sondern darum, dass es einmal da sein darf.";
  }

  if (
    lower.includes("was soll ich tun") ||
    lower.includes("wie geht es weiter") ||
    lower.includes("weiter")
  ) {
    return "Wir gehen Schritt für Schritt. Erst ordnen, dann handeln. Sag mir nur den nächsten Punkt, der dich gerade am meisten drückt.";
  }

  return `Ich habe dich verstanden.

Was du sagst, klingt nach etwas, das nicht einfach nur beantwortet werden will, sondern erst einmal Raum braucht.

Vielleicht ist der wichtigste Anfang gerade nicht, sofort alles zu lösen, sondern klarer zu spüren:
Was davon gehört wirklich zu dir — und was trägst du nur, weil es zu lange niemand mit dir sortiert hat?

Ich bin da. Wir können das gemeinsam langsamer anschauen.`;
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

    const responseText = createEchoResponse(content);

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
