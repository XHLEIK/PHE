'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  sendChatMessage,
  deleteChatSession,
} from '@/lib/api-client';
import {
  MessageSquare,
  Send,
  Trash2,
  ChevronLeft,
  Bot,
  User,
  Loader2,
  AlertCircle,
  X,
  Menu,
  Plus,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

interface ChatMsg {
  _id: string;
  senderType: 'user' | 'ai';
  content: string;
  createdAt: string;
}

interface ChatSessionInfo {
  complaintId: string;
  title: string;
  createdAt: string;
  accessToken: string;
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const complaintIdParam = searchParams.get('complaintId');
  const emailParam = searchParams.get('email');
  const tokenParam = searchParams.get('token');

  // State
  const [accessToken, setAccessToken] = useState<string>(tokenParam || '');
  const [activeComplaintId, setActiveComplaintId] = useState<string>(complaintIdParam || '');
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Initialize: create session or load existing
  useEffect(() => {
    async function init() {
      try {
        // If we have a token, use it directly
        if (tokenParam) {
          setAccessToken(tokenParam);
          if (complaintIdParam) {
            setActiveComplaintId(complaintIdParam);
          }
          setInitializing(false);
          return;
        }

        // If we have complaintId + email, create/get session
        if (complaintIdParam && emailParam) {
          const result = await createChatSession(complaintIdParam, emailParam);
          if (result.success && result.data) {
            setAccessToken(result.data.accessToken);
            setActiveComplaintId(complaintIdParam);

            // Update URL with token (remove email for security)
            const url = new URL(window.location.href);
            url.searchParams.set('token', result.data.accessToken);
            url.searchParams.set('complaintId', complaintIdParam);
            url.searchParams.delete('email');
            window.history.replaceState({}, '', url.toString());
          } else {
            setError(result.error || 'Failed to initialize chat');
          }
        } else {
          setError('Missing complaint information. Please submit a grievance first.');
        }
      } catch {
        setError('Failed to connect to chat service');
      } finally {
        setInitializing(false);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load sessions when we have a token
  useEffect(() => {
    if (!accessToken) return;

    async function loadSessions() {
      setLoadingSessions(true);
      try {
        const result = await getChatSessions(accessToken);
        if (result.success && result.data) {
          setSessions(result.data);
        }
      } catch {
        // silently fail
      } finally {
        setLoadingSessions(false);
      }
    }

    loadSessions();
  }, [accessToken]);

  // Load messages when active complaint changes
  useEffect(() => {
    if (!accessToken || !activeComplaintId) return;

    async function loadMessages() {
      setLoadingMessages(true);
      setMessages([]);
      try {
        const result = await getChatMessages(activeComplaintId, accessToken);
        if (result.success && result.data) {
          setMessages(result.data);
        }
      } catch {
        setError('Failed to load messages');
      } finally {
        setLoadingMessages(false);
      }
    }

    loadMessages();
  }, [accessToken, activeComplaintId]);

  // Auto-trigger first AI response if only 1 user message exists (just created)
  useEffect(() => {
    if (messages.length === 1 && messages[0].senderType === 'user' && accessToken && activeComplaintId) {
      // Send the initial message to get AI response
      async function getFirstAiResponse() {
        setSending(true);
        try {
          const result = await sendChatMessage(
            activeComplaintId,
            messages[0].content,
            accessToken
          );
          if (result.success && result.data) {
            // Replace the first user message + add AI response
            setMessages([
              { ...messages[0] },
              result.data.aiMessage,
            ]);
          }
        } catch {
          // silently fail
        } finally {
          setSending(false);
        }
      }
      getFirstAiResponse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || sending || !accessToken || !activeComplaintId) return;

    setInput('');
    setError('');

    // Optimistically add user message
    const tempUserMsg: ChatMsg = {
      _id: `temp-${Date.now()}`,
      senderType: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    setSending(true);
    try {
      const result = await sendChatMessage(activeComplaintId, msg, accessToken);
      if (result.success && result.data) {
        // Replace temp message with real one and add AI response
        setMessages((prev) => [
          ...prev.filter((m) => m._id !== tempUserMsg._id),
          result.data!.userMessage,
          result.data!.aiMessage,
        ]);
      } else {
        setError(result.error || 'Failed to send message');
        // Remove temp message on error
        setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
      }
    } catch {
      setError('Network error. Please try again.');
      setMessages((prev) => prev.filter((m) => m._id !== tempUserMsg._id));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const switchChat = (complaintId: string) => {
    setActiveComplaintId(complaintId);
    setSidebarOpen(false);

    const url = new URL(window.location.href);
    url.searchParams.set('complaintId', complaintId);
    url.searchParams.set('token', accessToken);
    url.searchParams.delete('email');
    window.history.replaceState({}, '', url.toString());
  };

  const handleDelete = async (complaintId: string) => {
    try {
      const result = await deleteChatSession(complaintId, accessToken);
      if (result.success) {
        setSessions((prev) => prev.filter((s) => s.complaintId !== complaintId));
        setDeleteConfirm(null);

        if (activeComplaintId === complaintId) {
          const remaining = sessions.filter((s) => s.complaintId !== complaintId);
          if (remaining.length > 0) {
            switchChat(remaining[0].complaintId);
          } else {
            setActiveComplaintId('');
            setMessages([]);
          }
        }
      }
    } catch {
      setError('Failed to delete chat');
    }
  };

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Simple markdown-like rendering for AI messages
  const renderContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Bold
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (processed.startsWith('- ') || processed.startsWith('• ')) {
        processed = `<span class="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 mr-2 mt-2 shrink-0"></span>${processed.slice(2)}`;
        return (
          <span key={i} className="flex items-start" dangerouslySetInnerHTML={{ __html: processed }} />
        );
      }
      // Phone numbers — make them clickable
      processed = processed.replace(
        /(\b(?:\+91[-\s]?)?(?:1800[-\s]?\d{3}[-\s]?\d{3,4}|0\d{2,4}[-\s]?\d{6,8}|\d{3})\b)/g,
        '<a href="tel:$1" class="text-amber-700 underline underline-offset-2 font-medium">$1</a>'
      );

      if (!processed.trim()) return <br key={i} />;
      return <span key={i} className="block" dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  // ── Loading state ──
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 size={32} className="animate-spin text-amber-700 mx-auto" />
          <p className="text-sm text-slate-500">Connecting to chat service...</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !accessToken) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center shadow-sm">
          <AlertCircle size={40} className="text-rose-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Unable to Connect</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link
            href="/complaint"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors"
          >
            <Plus size={16} />
            File a New Grievance
          </Link>
        </div>
      </div>
    );
  }

  const activeSession = sessions.find((s) => s.complaintId === activeComplaintId);

  return (
    <div className="min-h-screen h-screen bg-[#faf7f0] flex overflow-hidden">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
                <Shield size={16} className="text-amber-700" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900">Samadhan AI</h1>
                <p className="text-[10px] text-slate-400">Grievance Support</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <Link
            href="/complaint"
            className="flex items-center gap-2 w-full px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <Plus size={14} />
            File New Grievance
          </Link>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto p-2">
          <p className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Your Grievance Chats
          </p>

          {loadingSessions ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No chats yet</p>
            </div>
          ) : (
            <div className="space-y-1 mt-1">
              {sessions.map((s) => (
                <div key={s.complaintId} className="group relative">
                  <button
                    onClick={() => switchChat(s.complaintId)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors text-sm ${
                      activeComplaintId === s.complaintId
                        ? 'bg-amber-50 border border-amber-200 text-amber-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="font-medium text-xs truncate pr-6">{s.complaintId}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{s.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(s.createdAt)}</p>
                  </button>

                  {/* Delete button */}
                  {deleteConfirm === s.complaintId ? (
                    <div className="absolute right-1 top-1 flex items-center gap-1 bg-white border border-rose-200 rounded-lg p-1 shadow-sm z-10">
                      <button
                        onClick={() => handleDelete(s.complaintId)}
                        className="px-2 py-1 bg-rose-50 text-rose-600 text-[10px] font-semibold rounded hover:bg-rose-100 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-1.5 py-1 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(s.complaintId)}
                      className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded transition-all"
                    >
                      <Trash2 size={13} className="text-slate-400 hover:text-rose-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">
            Helpdesk: <a href="tel:18003453601" className="text-amber-700 font-medium">1800-345-3601</a>
          </p>
        </div>
      </aside>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>

          <Link
            href="/complaint"
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors hidden sm:block"
          >
            <ChevronLeft size={18} className="text-slate-500" />
          </Link>

          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Bot size={16} className="text-amber-700" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 truncate">
                {activeSession?.title || 'Samadhan AI Assistant'}
              </h2>
              <p className="text-[10px] text-slate-400 truncate">
                {activeComplaintId ? `${activeComplaintId} • AI-powered assistance` : 'AI-powered grievance support'}
              </p>
            </div>
          </div>

          {sending && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 shrink-0">
              <Loader2 size={14} className="animate-spin" />
              <span className="hidden sm:inline">Thinking...</span>
            </div>
          )}
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {loadingMessages ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : messages.length === 0 && !activeComplaintId ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mb-4">
                <MessageSquare size={28} className="text-amber-700" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Welcome to Samadhan AI</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-4">
                File a grievance to start chatting with our AI assistant. 
                It will help you with possible solutions and relevant helpline numbers.
              </p>
              <Link
                href="/complaint"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors"
              >
                <Plus size={16} />
                File a Grievance
              </Link>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex gap-3 ${msg.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.senderType === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-1">
                      <Bot size={14} className="text-amber-700" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.senderType === 'user'
                        ? 'bg-amber-700 text-white rounded-tr-md'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-md shadow-sm'
                    }`}
                  >
                    <div className="space-y-1">{renderContent(msg.content)}</div>
                    <p
                      className={`text-[10px] mt-2 ${
                        msg.senderType === 'user' ? 'text-amber-200' : 'text-slate-400'
                      }`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>

                  {msg.senderType === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-1">
                      <User size={14} className="text-slate-500" />
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={14} className="text-amber-700" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              <AlertCircle size={14} className="shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="p-0.5 hover:bg-rose-100 rounded">
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Input area */}
        {activeComplaintId && (
          <div className="bg-white border-t border-slate-200 p-4">
            <div className="flex items-end gap-3 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={1}
                  maxLength={2000}
                  disabled={sending}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-[#faf7f0] px-4 py-3 pr-12 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 disabled:opacity-50 transition-colors"
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  onInput={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
                />
                <span className="absolute right-3 bottom-2 text-[10px] text-slate-300">
                  {input.length}/2000
                </span>
              </div>
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="p-3 bg-amber-700 text-white rounded-xl hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {sending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Press Enter to send • Shift+Enter for new line • AI may occasionally make errors
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#faf7f0] flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-amber-700" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
