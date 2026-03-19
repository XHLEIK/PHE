'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Bot, User, Send, Loader2, MessageSquare,
} from 'lucide-react';
import {
  getCitizenChatMessages,
  sendCitizenChatMessage,
  type ChatMessageInfo,
} from '@/lib/citizen-api-client';

export default function CitizenChatConversationPage() {
  const { complaintId } = useParams<{ complaintId: string }>();
  const [messages, setMessages] = useState<ChatMessageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!complaintId) return;
    setLoading(true);
    try {
      const res = await getCitizenChatMessages(complaintId);
      if (res.success && res.data) {
        setMessages(res.data);
      } else {
        setError(res.error || 'Failed to load messages');
      }
    } catch {
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || sending || !complaintId) return;

    setSending(true);
    setInput('');
    setError('');

    // Optimistic: show user message immediately
    const optimisticUserMsg: ChatMessageInfo = {
      _id: `temp-${Date.now()}`,
      senderType: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    try {
      const res = await sendCitizenChatMessage(complaintId, trimmed);
      if (res.success && res.data) {
        // Replace optimistic message with real data and add AI reply
        setMessages(prev => {
          const withoutOptimistic = prev.filter(m => m._id !== optimisticUserMsg._id);
          return [
            ...withoutOptimistic,
            res.data!.userMessage,
            res.data!.aiMessage,
          ];
        });
      } else {
        setError(res.error || 'Failed to send message');
        // Revert optimistic message
        setMessages(prev => prev.filter(m => m._id !== optimisticUserMsg._id));
        setInput(trimmed);
      }
    } catch {
      setError('Failed to send message');
      setMessages(prev => prev.filter(m => m._id !== optimisticUserMsg._id));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  // Group messages by date
  let lastDate = '';

  return (
    <div className="citizen-page-shell max-w-4xl flex flex-col h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <Link
          href="/citizen/chats"
          className="p-2 rounded-lg hover:bg-gov-aqua-50 text-slate-500 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="w-9 h-9 bg-gov-aqua-50 text-gov-blue-700 border border-gov-aqua-200 rounded-xl flex items-center justify-center">
          <MessageSquare size={18} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">
            Chat — {complaintId}
          </h1>
          <p className="text-sm text-slate-400">AI Grievance Assistant</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gov-blue-100 shadow-sm p-4 space-y-1 mb-4">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mr-2" size={20} />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-base">
            No messages yet. Start the conversation below.
          </div>
        ) : (
          messages.map((msg) => {
            const msgDate = fmtDate(msg.createdAt);
            let showDate = false;
            if (msgDate !== lastDate) {
              showDate = true;
              lastDate = msgDate;
            }

            return (
              <React.Fragment key={msg._id}>
                {showDate && (
                  <div className="text-center py-2">
                    <span className="text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                      {msgDate}
                    </span>
                  </div>
                )}
                <div
                  className={`flex gap-2.5 py-2 ${
                    msg.senderType === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.senderType === 'ai' && (
                    <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={14} />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed ${
                      msg.senderType === 'user'
                        ? 'bg-gov-blue-800 text-white rounded-br-md'
                        : 'bg-gov-aqua-50 text-slate-800 border border-gov-aqua-200 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.senderType === 'user'
                          ? 'text-blue-100'
                          : 'text-slate-400'
                      }`}
                    >
                      {fmtTime(msg.createdAt)}
                    </p>
                  </div>
                  {msg.senderType === 'user' && (
                    <div className="w-7 h-7 bg-slate-200 text-slate-600 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <User size={14} />
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="shrink-0 flex gap-2 bg-white rounded-2xl border border-gov-blue-100 shadow-sm p-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          disabled={sending || loading}
          maxLength={2000}
          className="flex-1 bg-gov-neutral-50 rounded-xl px-4 py-3 text-base text-slate-800 placeholder-slate-400 border border-gov-blue-200 focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || loading}
          className="px-4 py-3 bg-gov-blue-800 hover:bg-gov-blue-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-base font-semibold"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </form>
    </div>
  );
}
