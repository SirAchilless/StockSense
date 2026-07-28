export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  disclaimer: boolean;
  confidence: number | null;
  createdAt: string;
}

export interface ChatThread {
  id: string;
  title: string | null;
  symbol: string | null;
  updatedAt: string;
}

export interface SendMessageResponse {
  threadId: string;
  messageId: string;
  reply: string;
  confidence: number;
  dataAvailable: boolean;
  disclaimer: string | null;
  contextSymbol: string | null;
}
