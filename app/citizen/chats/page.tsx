'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MessageSquare, Loader2, Bot, ChevronRight, Inbox } from 'lucide-react';
import { getCitizenChatSessions, type ChatSessionInfo } from '@/lib/citizen-api-client';

export default function CitizenChatsPage() {
  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCitizenChatSessions();
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="citizen-page-shell max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gov-aqua-50 text-gov-blue-700 rounded-xl border border-gov-aqua-200 flex items-center justify-center">
          <MessageSquare size={22} />
        </div>
        <div>
          <h1 className="citizen-title text-2xl">AI Chat History</h1>
          <p className="citizen-subtitle">
            All your conversations with the AI assistant about your grievances
          </p>
        </div>
      </div>

      {/* Chat sessions */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading chats…
        </div>
      ) : sessions.length === 0 ? (
        <div className="citizen-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gov-aqua-50 border border-gov-aqua-200 rounded-2xl mb-4">
            <Inbox size={28} className="text-gov-blue-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No chat history yet</h3>
          <p className="text-sm text-slate-500 mb-6">
            Your AI conversations about grievances will appear here.
            Submit a complaint and chat with the AI assistant to get started.
          </p>
          <Link
            href="/citizen/complaints/new"
            className="citizen-btn-primary"
          >
            File a Complaint
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link
              key={s._id}
              href={`/citizen/chats/${encodeURIComponent(s.complaintId)}`}
              className="block citizen-card hover:shadow-md hover:border-gov-aqua-200 transition-all p-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-gov-aqua-100 to-gov-aqua-50 text-gov-blue-700 rounded-xl flex items-center justify-center shrink-0">
                  <Bot size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{s.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span className="font-mono">{s.complaintId}</span>
                    <span>•</span>
                    <span>{fmtDate(s.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-slate-300 group-hover:text-gov-blue-700 shrink-0 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
