const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface DocumentInfo {
  id: string;
  title: string;
  filename: string;
  fileSize: number;
  uploadDate: string;
  userId?: string;
  chunksIngested?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  documentId?: string | null;
  provider?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  timestamp: string;
  sessionId?: string;
  sources?: any;
}

export interface AgentResponse {
  answer: string;
  sources: any[];
  userId: string;
  messageId: string;
  sessionId?: string;
}

/**
 * API client to connect the Next.js frontend with the NestJS backend.
 */
export const api = {
  /**
   * Fetch all uploaded documents
   */
  async getDocuments(): Promise<DocumentInfo[]> {
    const res = await fetch(`${API_BASE_URL}/documents`);
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  /**
   * Upload a new document file (.pdf, .txt, .md)
   */
  async uploadDocument(file: File, title: string, userId?: string): Promise<DocumentInfo> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    if (userId) {
      formData.append('userId', userId);
    }

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Failed to upload document');
    }

    return res.json();
  },

  /**
   * Delete a document by ID
   */
  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete document');
  },

  /**
   * Get all chat sessions for user
   */
  async getSessions(userId: string): Promise<ChatSession[]> {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${userId}`);
    if (!res.ok) throw new Error('Failed to fetch chat sessions');
    return res.json();
  },

  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    title?: string,
    documentId?: string,
    provider?: string,
  ): Promise<ChatSession> {
    const res = await fetch(`${API_BASE_URL}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, documentId, provider }),
    });
    if (!res.ok) throw new Error('Failed to create chat session');
    return res.json();
  },

  /**
   * Update chat session (e.g. rename, change focused document, change provider)
   */
  async updateSession(
    sessionId: string,
    data: { title?: string; documentId?: string | null; provider?: string },
  ): Promise<ChatSession> {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update session');
    return res.json();
  },

  /**
   * Delete chat session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete chat session');
  },

  /**
   * Chat with the LangChain Agent reasoning loop
   */
  async chatWithAgent(
    message: string,
    userId?: string,
    sessionId?: string,
    documentId?: string,
    provider?: string,
  ): Promise<AgentResponse> {
    const res = await fetch(`${API_BASE_URL}/agent/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, userId, sessionId, documentId, provider }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || 'Agent error encountered');
    }

    return res.json();
  },

  /**
   * Fetch conversation history for a user, optionally filtered by session
   */
  async getChatHistory(userId: string, sessionId?: string): Promise<ChatMessage[]> {
    const url = new URL(`${API_BASE_URL}/chat/history/${userId}`);
    if (sessionId) {
      url.searchParams.append('sessionId', sessionId);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return res.json();
  },

  /**
   * Clear conversation history for a user or session
   */
  async clearChatHistory(userId: string, sessionId?: string): Promise<void> {
    const url = new URL(`${API_BASE_URL}/chat/history/${userId}`);
    if (sessionId) {
      url.searchParams.append('sessionId', sessionId);
    }
    const res = await fetch(url.toString(), {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear chat history');
  },
};
