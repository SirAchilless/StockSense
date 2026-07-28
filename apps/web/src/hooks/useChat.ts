import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import type { ChatMessage, SendMessageResponse } from '../types/chat';

interface UseChatOptions {
  initialSymbol?: string;
}

export function useChat({ initialSymbol }: UseChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [contextSymbol, setContextSymbol] = useState<string>(initialSymbol ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      setError(null);

      // Optimistically add user message
      const optimisticUser: ChatMessage = {
        id: `opt-${Date.now()}`,
        role: 'user',
        content,
        disclaimer: false,
        confidence: null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);
      setIsLoading(true);

      try {
        const body: Record<string, unknown> = { message: content };
        if (threadId) body.threadId = threadId;
        if (contextSymbol.trim()) body.symbol = contextSymbol.trim().toUpperCase();

        const res = await api.post<{ data: SendMessageResponse }>('/chat/message', body);
        const data = res.data.data;

        if (!threadId) setThreadId(data.threadId);

        const assistantMsg: ChatMessage = {
          id: data.messageId,
          role: 'assistant',
          content: data.reply,
          disclaimer: !!data.disclaimer,
          confidence: data.confidence,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setError('Message failed to send. Please try again.');
        // Remove the optimistic user message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      } finally {
        setIsLoading(false);
      }
    },
    [threadId, contextSymbol]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setThreadId(null);
    setError(null);
  }, []);

  return { messages, threadId, contextSymbol, setContextSymbol, isLoading, error, sendMessage, reset };
}
