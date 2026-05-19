import { useState, useRef, useEffect, useCallback } from "react";
import { 
  useListOpenaiConversations, 
  useCreateOpenaiConversation, 
  useGetOpenaiConversation, 
  useDeleteOpenaiConversation,
  getGetOpenaiConversationQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export type MessageRole = "user" | "assistant" | "system";

export interface StreamMessage {
  id: string;
  role: MessageRole;
  content: string;
}

export function useChat() {
  const queryClient = useQueryClient();
  
  const { data: conversations, isLoading: isConversationsLoading } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  const deleteConversation = useDeleteOpenaiConversation();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [streamedContent, setStreamedContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

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

    // Optimistically update the UI by adding a temporary user message
    const tempUserMsg = {
      id: Date.now(),
      conversationId: activeConversationId,
      role: "user",
      content,
      createdAt: new Date().toISOString()
    };
    
    queryClient.setQueryData(getGetOpenaiConversationQueryKey(activeConversationId), (old: any) => {
      if (!old) return old;
      return {
        ...old,
        messages: [...old.messages, tempUserMsg]
      };
    });

    setIsStreaming(true);
    setStreamedContent("");

    try {
      const response = await fetch(`/api/openai/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let echoContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(l => l.startsWith('data: '));
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.content) {
              echoContent += data.content;
              setStreamedContent(echoContent);
            }
          } catch (e) {
            console.error("Failed to parse SSE line", line);
          }
        }
      }

      // Invalidate to fetch the final stored messages
      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(activeConversationId) });
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
