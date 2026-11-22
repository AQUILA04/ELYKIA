export interface ApiResponse<T> {
  data: T;
  status?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GuideSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | string;
  content: string;
  intent?: string;
  metadata?: ChatMessageMetadata;
  createdAt?: string;
}

export interface ChatMessageMetadata {
  rowCount?: number;
  columns?: string[];
  preview?: Record<string, unknown>[];
  sources?: GuideSource[];
  sql?: string;
  suggestions?: string[];
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
}

export interface AiChatResponse {
  conversationId: string;
  reply: string;
  intent: 'DATA' | 'HOW_TO' | string;
  rowCount?: number;
  columns?: string[];
  preview?: Record<string, unknown>[];
  sources?: GuideSource[];
  suggestions?: string[];
  sql?: string;
}

export interface AiHealthStatus {
  enabled: boolean;
  provider: string;
  model: string;
  schemaTables: number;
}
