import { useState, useRef, useEffect, useCallback } from "react";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  getGetOpenaiConversationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export type MessageRole = "user" | "assistant" | "system";

export interface StreamMessage {
  id: string;
  role: MessageRole;
  content: string;
}

interface UseChatOptions {
  onResponseComplete?: (content: string) => void;
}

export function useChat({ onResponseComplete }: UseChatOptions = {}) {
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: isConversationsLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const onResponseCompleteRef = useRef(onResponseComplete);
  onResponseCompleteRef.current = onResponseComplete;

  // Auto-create or select first conversation on load
  useEffect(() => {
    if (!isConversationsLoading && conversations) {
      if (conversations.length > 0 && activeConversationId === null) {
        setActiveConversationId(conversations[0].id);
      } else if (conversations.length === 0 && !createConversation.isPending) {
        createConversation.mutate({ data: { title: "New Sync" } }, {
          onSuccess: (conv) => {
            setActiveConversationId(conv.id);
            queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
          }
        });
      }
    }
  }, [conversations, isConversationsLoading, activeConversationId, createConversation.isPending, queryClient, createConversation]);

  const { data: activeConversation } = useGetOpenaiConversation(
    activeConversationId as number,
    { query: { enabled: !!activeConversationId, queryKey: getGetOpenaiConversationQueryKey(activeConversationId as number) } }
  );

  const startNewConversation = useCallback(() => {
    createConversation.mutate({ data: { title: "New Sync" } }, {
      onSuccess: (conv) => {
        setActiveConversationId(conv.id);
        queryClient.invalidateQueries({ queryKey: ["/api/openai/conversations"] });
      }
    });
  }, [createConversation, queryClient]);

  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversationId || !content.trim()) return;

    const tempUserMsg = {
      id: Date.now(),
      conversationId: activeConversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };

    queryClient.setQueryData(getGetOpenaiConversationQueryKey(activeConversationId), (old: any) => {
      if (!old) return old;
      return { ...old, messages: [...old.messages, tempUserMsg] };
    });

    setIsStreaming(true);
    setStreamedContent("");

    try {
      const response = await fetch(`/api/openai/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let echoContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter(l => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              echoContent += data.content;
              setStreamedContent(echoContent);
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeConversationId) });

      if (echoContent) {
        onResponseCompleteRef.current?.(echoContent);
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsStreaming(false);
      setStreamedContent("");
    }
  }, [activeConversationId, queryClient]);

  return {
    activeConversation,
    activeConversationId,
    startNewConversation,
    sendMessage,
    streamedContent,
    isStreaming,
    isLoading: isConversationsLoading
  };
}
