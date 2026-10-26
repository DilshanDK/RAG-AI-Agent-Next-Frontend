'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Trash2, 
  UploadCloud, 
  Send, 
  Layers, 
  Cpu, 
  Sparkles, 
  Loader, 
  RefreshCw, 
  Info,
  Plus,
  MessageSquare,
  Lock,
  Target,
  X,
  ChevronDown,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, DocumentInfo, ChatMessage, ChatSession } from '../services/api';

const AI_PROVIDERS = [
  { id: 'groq', name: 'Groq (Llama 3.1 8B)', tag: 'Fastest' },
  { id: 'gemini', name: 'Google Gemini (1.5 Flash)', tag: 'Multimodal' },
  { id: 'openrouter', name: 'OpenRouter (Llama 3.3 70B)', tag: 'High-Capacity' },
];

export default function Home() {
  const [userId, setUserId] = useState<string>('');
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionTitle, setCurrentSessionTitle] = useState<string>('New Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [expandedCitations, setExpandedCitations] = useState<{ [msgId: string]: boolean }>({});

  // Model & Document Scoping state
  const [selectedProvider, setSelectedProvider] = useState<string>('groq');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [showSessionsDropdown, setShowSessionsDropdown] = useState<boolean>(false);
  const [showDocFocusDropdown, setShowDocFocusDropdown] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if active chat has existing conversation messages
  const isOngoingChat = messages.length > 0;

  // 1. Initialize user ID
  useEffect(() => {
    let id = localStorage.getItem('rag_user_id');
    if (!id) {
      id = 'user-' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('rag_user_id', id);
    }
    setUserId(id);
  }, []);

  // 2. Fetch documents and sessions
  useEffect(() => {
    if (!userId) return;
    fetchDocuments();
    fetchSessions();
  }, [userId]);

  // 3. Fetch chat history when currentSessionId changes
  useEffect(() => {
    if (!userId) return;
    if (currentSessionId) {
      fetchChatHistory(currentSessionId);
    } else {
      setMessages([]);
      setCurrentSessionTitle('New Chat');
    }
  }, [currentSessionId, userId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // API Call: Fetch all documents
  const fetchDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (e) {
      showStatus('Failed to load documents listing.', true);
    }
  };

  // API Call: Fetch chat sessions
  const fetchSessions = async () => {
    if (!userId) return;
    try {
      const sess = await api.getSessions(userId);
      setSessions(sess);
      // Auto-select latest session if available and no session is active
      if (!currentSessionId && sess.length > 0) {
        setCurrentSessionId(sess[0].id);
        setCurrentSessionTitle(sess[0].title);
        if (sess[0].documentId) setSelectedDocumentId(sess[0].documentId);
        if (sess[0].provider) setSelectedProvider(sess[0].provider);
      }
    } catch (e) {
      console.warn('Could not load sessions:', e);
    }
  };

  // API Call: Fetch chat history for session
  const fetchChatHistory = async (sessionId: string) => {
    try {
      const history = await api.getChatHistory(userId, sessionId);
      const sortedHistory = [...history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedHistory);
    } catch (e) {
      showStatus('Failed to retrieve chat history.', true);
    }
  };

  // Status message utility
  const showStatus = (text: string, isError = false) => {
    setStatusMessage({ text, isError });
    setTimeout(() => {
      setStatusMessage(null);
    }, 5000);
  };

  // Start a brand new chat
  const handleStartNewChat = (targetedDocId: string | null = null) => {
    setCurrentSessionId(null);
    setCurrentSessionTitle('New Chat');
    setMessages([]);
    setSelectedDocumentId(targetedDocId);
    setShowSessionsDropdown(false);
    showStatus('Started new chat session. You can configure model & file focus.');
  };

  // Switch to an existing session
  const handleSelectSession = (s: ChatSession) => {
    setCurrentSessionId(s.id);
    setCurrentSessionTitle(s.title);
    setSelectedDocumentId(s.documentId || null);
    if (s.provider) setSelectedProvider(s.provider);
    setShowSessionsDropdown(false);
  };

  // Delete a session
  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this chat thread?')) return;
    try {
      await api.deleteSession(sessionId);
      showStatus('Chat thread deleted.');
      const updated = sessions.filter((s) => s.id !== sessionId);
      setSessions(updated);
      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          handleSelectSession(updated[0]);
        } else {
          handleStartNewChat(null);
        }
      }
    } catch (e) {
      showStatus('Failed to delete chat thread.', true);
    }
  };

  // Handle Drag & Drop / File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const friendlyName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setCustomTitle(friendlyName);
    }
  };

  // API Call: Ingest/Upload document
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    showStatus('Uploading and parsing document vector chunks...');

    try {
      await api.uploadDocument(selectedFile, customTitle || selectedFile.name, userId);
      setSelectedFile(null);
      setCustomTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      showStatus('Document uploaded and ingested successfully!');
      fetchDocuments();
    } catch (e: any) {
      showStatus(e.message || 'File upload failed.', true);
    } finally {
      setIsUploading(false);
    }
  };

  // API Call: Delete document
  const handleDeleteDocument = async (id: string) => {
    try {
      await api.deleteDocument(id);
      showStatus('Document removed and vector indexes cleaned up.');
      if (selectedDocumentId === id) {
        setSelectedDocumentId(null);
      }
      fetchDocuments();
    } catch (e) {
      showStatus('Could not delete document.', true);
    }
  };

  // Study specific file action
  const handleStudyFile = (doc: DocumentInfo) => {
    handleStartNewChat(doc.id);
    showStatus(`Targeted chat on: "${doc.title}"`);
  };

  // API Call: Send chat message to Agent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    setIsTyping(true);

    const tempUserMsg: ChatMessage = {
      id: 'temp-user-' + Date.now(),
      role: 'user',
      message: userText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await api.chatWithAgent(
        userText,
        userId,
        currentSessionId || undefined,
        selectedDocumentId || undefined,
        selectedProvider,
      );

      // If this was a new session, backend returns the created sessionId
      if (response.sessionId && (!currentSessionId || currentSessionId !== response.sessionId)) {
        setCurrentSessionId(response.sessionId);
        setCurrentSessionTitle(userText.substring(0, 30));
        fetchSessions();
      }

      const agentMsg: ChatMessage = {
        id: response.messageId,
        role: 'assistant',
        message: response.answer,
        timestamp: new Date().toISOString(),
        sources: response.sources,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (e: any) {
      showStatus(e.message || 'Agent failed to respond.', true);
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsTyping(false);
    }
  };

  // Clear current chat
  const handleClearHistory = async () => {
    if (!confirm('Clear all messages in this conversation?')) return;
    try {
      await api.clearChatHistory(userId, currentSessionId || undefined);
      setMessages([]);
      showStatus('Conversation memory cleared.');
    } catch (e) {
      showStatus('Could not clear history.', true);
    }
  };

  // Toggle citations accordion
  const toggleCitations = (msgId: string) => {
    setExpandedCitations((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Active focused document details
  const focusedDoc = documents.find((d) => d.id === selectedDocumentId);

  return (
    <main className="w-screen h-screen flex items-center justify-center p-3 md:p-6 z-10">
      
      {/* Dynamic Status Alert HUD */}
      {statusMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2 p-4 rounded-xl backdrop-blur-md shadow-lg border transition-all duration-300 ${
          statusMessage.isError 
            ? 'bg-red-950/70 border-red-500/30 text-red-200' 
            : 'bg-cyan-950/70 border-cyan-500/30 text-cyan-200'
        }`}>
          <Info size={18} />
          <span className="text-sm font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Main Glass Dashboard */}
      <div className="w-[98vw] h-[94vh] max-w-7xl rounded-3xl flex flex-col md:flex-row overflow-hidden glass-container shadow-2xl">
        
        {/* SIDEBAR: Document Management & File Targets */}
        <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/5 flex flex-col h-1/3 md:h-full bg-black/10">
          
          {/* Header */}
          <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400 health-dot-pulse" />
              <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
                RAG Agent <span className="text-[10px] uppercase bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">Active</span>
              </h1>
            </div>
            <button 
              onClick={fetchDocuments} 
              className="p-1.5 rounded-lg glass-button text-white/70 hover:text-white"
              title="Refresh files"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Upload Form */}
          <div className="p-4 border-b border-white/5">
            <form onSubmit={handleUpload} className="space-y-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-white/10 hover:border-cyan-400/40 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all bg-white/[0.01]"
              >
                <UploadCloud size={24} className="text-white/40 mb-1.5" />
                <span className="text-xs text-white/70 text-center font-medium">
                  {selectedFile ? selectedFile.name : 'Select PDF, TXT, or MD'}
                </span>
                <span className="text-[10px] text-white/40 mt-0.5">Max size 10MB</span>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.md"
                  className="hidden"
                />
              </div>

              {selectedFile && (
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Document Custom Name" 
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg glass-input text-white"
                  />
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="w-full text-xs py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader size={12} className="animate-spin" /> Ingesting...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} /> Sync to Vector Store
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40 px-1 mb-1">
              <span>Ingested Knowledge ({documents.length})</span>
            </div>
            
            {documents.length === 0 ? (
              <div className="text-center py-6 text-white/30 text-xs italic">
                No documents uploaded yet. Upload a file above to begin!
              </div>
            ) : (
              documents.map((doc) => {
                const isFocused = selectedDocumentId === doc.id;
                return (
                  <div 
                    key={doc.id}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isFocused 
                        ? 'border-cyan-400/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/5' 
                        : 'border-white/5 bg-white/[0.015] hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                        <FileText size={16} className={isFocused ? 'text-cyan-300' : 'text-cyan-400/70'} />
                        <div className="overflow-hidden">
                          <div className="text-xs font-semibold text-white/90 truncate" title={doc.title}>
                            {doc.title}
                          </div>
                          <div className="text-[9px] text-white/40 truncate">
                            {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.uploadDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition"
                        title="Delete file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* Quick Action: Chat with this file */}
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                      <button 
                        onClick={() => handleStudyFile(doc)}
                        className={`text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1 transition ${
                          isFocused 
                            ? 'bg-cyan-500 text-black font-semibold' 
                            : 'bg-white/5 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200'
                        }`}
                        title="Start isolated study chat about this file"
                      >
                        <Target size={11} />
                        {isFocused ? 'Focused in Chat' : 'Study This File'}
                      </button>
                      {isFocused && (
                        <button 
                          onClick={() => setSelectedDocumentId(null)}
                          className="text-[9px] text-white/40 hover:text-white flex items-center gap-0.5"
                          title="Clear focus back to all files"
                        >
                          <X size={10} /> Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* CHAT HUB */}
        <section className="flex-1 flex flex-col h-2/3 md:h-full bg-black/25 relative">
          
          {/* Top Bar: Sessions Switcher, Model Selector & Focus Pill */}
          <div className="p-3 md:p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-2.5 bg-black/20">
            
            {/* Left: Session Dropdown & + New Chat */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleStartNewChat(null)}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/10"
                title="Start a fresh conversation"
              >
                <Plus size={14} /> New Chat
              </button>

              {/* Sessions Drawer Button */}
              <div className="relative">
                <button 
                  onClick={() => setShowSessionsDropdown(!showSessionsDropdown)}
                  className="px-3 py-1.5 rounded-xl glass-button text-xs text-white/80 hover:text-white flex items-center gap-1.5"
                >
                  <MessageSquare size={13} className="text-cyan-400" />
                  <span className="max-w-[140px] truncate font-medium">{currentSessionTitle}</span>
                  <ChevronDown size={12} className="text-white/40" />
                </button>

                {/* Dropdown Menu */}
                {showSessionsDropdown && (
                  <div className="absolute top-10 left-0 w-72 rounded-2xl glass-container p-2 z-50 space-y-1 shadow-2xl border border-white/10 animate-fadeIn">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2 py-1">
                      Chat Threads ({sessions.length})
                    </div>
                    {sessions.length === 0 ? (
                      <div className="text-xs text-white/40 italic p-2 text-center">No past chats yet.</div>
                    ) : (
                      sessions.map((s) => (
                        <div 
                          key={s.id}
                          onClick={() => handleSelectSession(s)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                            currentSessionId === s.id 
                              ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' 
                              : 'hover:bg-white/5 text-white/70'
                          }`}
                        >
                          <div className="overflow-hidden mr-2">
                            <div className="font-medium truncate">{s.title}</div>
                            <div className="text-[9px] text-white/40 flex items-center gap-1">
                              <span>{s.provider || 'groq'}</span>
                              {s.documentId && <span>• 📄 Scoped</span>}
                            </div>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            className="p-1 text-white/30 hover:text-red-400 rounded transition"
                            title="Delete thread"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Model Selection Dropdown (Disabled during ongoing chats!) */}
            <div className="flex items-center gap-2">
              
              {/* Model Selector */}
              <div className="flex items-center gap-1.5" title={isOngoingChat ? 'Model is locked for ongoing chat' : 'Choose AI Provider'}>
                {isOngoingChat ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white/50 cursor-not-allowed">
                    <Lock size={12} className="text-yellow-400/80" />
                    <span className="font-medium capitalize">{selectedProvider}</span>
                    <span className="text-[9px] text-white/30">(Locked)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-white/40 font-medium hidden sm:inline">Model:</span>
                    <select
                      value={selectedProvider}
                      onChange={(e) => setSelectedProvider(e.target.value)}
                      className="px-2.5 py-1.5 rounded-xl glass-input text-xs text-white bg-black/40 border border-white/10 focus:border-cyan-400/50 cursor-pointer"
                    >
                      {AI_PROVIDERS.map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {messages.length > 0 && (
                <button 
                  onClick={handleClearHistory}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border border-white/5 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition"
                  title="Clear messages in this chat"
                >
                  Clear
                </button>
              )}
            </div>

          </div>

          {/* Target File Focus Pill Bar */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-black/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 flex items-center gap-1">
                <Target size={11} className="text-cyan-400" /> Focus Target:
              </span>

              {focusedDoc ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[11px] font-medium shadow-sm">
                  <FileText size={11} />
                  <span className="max-w-[200px] truncate">{focusedDoc.title}</span>
                  <button 
                    onClick={() => setSelectedDocumentId(null)}
                    className="hover:text-white ml-0.5"
                    title="Clear file focus (search all files)"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button 
                    onClick={() => setShowDocFocusDropdown(!showDocFocusDropdown)}
                    className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white px-2 py-0.5 rounded-md hover:bg-white/5 transition"
                  >
                    <span>All Knowledge Base ({documents.length} files)</span>
                    <ChevronDown size={11} className="text-white/40" />
                  </button>

                  {showDocFocusDropdown && (
                    <div className="absolute top-7 left-0 w-64 rounded-xl glass-container p-1.5 z-40 space-y-1 shadow-2xl border border-white/10 animate-fadeIn">
                      <button 
                        onClick={() => { setSelectedDocumentId(null); setShowDocFocusDropdown(false); }}
                        className={`w-full text-left p-1.5 rounded-lg text-xs flex items-center justify-between ${
                          selectedDocumentId === null ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-white/5 text-white/70'
                        }`}
                      >
                        <span>🌐 All Knowledge Base</span>
                        {selectedDocumentId === null && <Check size={12} />}
                      </button>
                      <div className="border-t border-white/5 my-1" />
                      {documents.map((d) => (
                        <button 
                          key={d.id}
                          onClick={() => { setSelectedDocumentId(d.id); setShowDocFocusDropdown(false); }}
                          className={`w-full text-left p-1.5 rounded-lg text-xs flex items-center justify-between truncate ${
                            selectedDocumentId === d.id ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-white/5 text-white/70'
                          }`}
                        >
                          <span className="truncate">{d.title}</span>
                          {selectedDocumentId === d.id && <Check size={12} className="shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-[10px] text-white/30 hidden sm:block">
              {focusedDoc ? 'Responses strictly filtered to this document' : 'Responses search across all files'}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 flex items-center justify-center border border-white/10">
                  <Layers size={22} className="text-cyan-400" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <h3 className="text-sm font-bold text-white">
                    {focusedDoc ? `Study Session: ${focusedDoc.title}` : 'Ask your Knowledge Base'}
                  </h3>
                  <p className="text-xs text-white/50 leading-relaxed">
                    {focusedDoc 
                      ? 'The AI Agent will prioritize searches and summaries exclusively on this document.' 
                      : 'Upload documents or mention a specific file to isolate your study context. The AI Agent will reason and cite facts automatically.'}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-2xl p-3.5 shadow-md border ${
                    msg.role === 'user' 
                      ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-50' 
                      : 'bg-white/[0.02] border-white/5 text-white/90'
                  }`}>
                    {/* Message content */}
                    <div className="text-xs leading-relaxed prose prose-invert max-w-none">
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      ) : (
                        <ReactMarkdown>{msg.message}</ReactMarkdown>
                      )}
                    </div>

                    {/* Citations accordion */}
                    {msg.role === 'assistant' && msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/5">
                        <button 
                          onClick={() => toggleCitations(msg.id)}
                          className="flex items-center gap-1.5 text-[10px] text-cyan-400 font-bold hover:text-cyan-300 transition"
                        >
                          <FileText size={10} /> 
                          {expandedCitations[msg.id] ? 'Hide Referenced Sources' : `Show Sources (${msg.sources.length})`}
                        </button>
                        
                        {expandedCitations[msg.id] && (
                          <div className="mt-2 space-y-2 animate-fadeIn">
                            {msg.sources.map((src, index) => (
                              <div 
                                key={index} 
                                className="p-2 rounded-lg bg-white/[0.01] border border-white/5 text-[10px] space-y-1"
                              >
                                <div className="flex items-center justify-between text-white/50 font-semibold">
                                  <span className="truncate">{src.documentTitle}</span>
                                  {src.similarity && (
                                    <span className="text-cyan-400 shrink-0 ml-2">Match: {src.similarity}%</span>
                                  )}
                                </div>
                                <div className="text-white/40 italic line-clamp-3">
                                  "{src.excerpt || src.content}"
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Timestamp */}
                  <span className="text-[9px] text-white/30 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}

            {/* Typing Loader */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="rounded-2xl p-3.5 bg-white/[0.02] border border-white/5 text-white/50 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[10px] font-medium tracking-wide">
                    Agent is thinking using {selectedProvider}...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Panel */}
          <div className="p-4 border-t border-white/5 bg-black/15">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input 
                type="text" 
                placeholder={
                  focusedDoc 
                    ? `Ask about "${focusedDoc.title}"...` 
                    : "Ask the Agent to search, summarize, or list knowledge..."
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isTyping}
                className="flex-1 px-4 py-3 rounded-xl glass-input text-xs text-white"
              />
              <button 
                type="submit" 
                disabled={!inputMessage.trim() || isTyping}
                className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-black flex items-center justify-center transition disabled:opacity-40 disabled:hover:bg-cyan-500 shadow-lg shadow-cyan-500/20"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

        </section>

      </div>
    </main>
  );
}
