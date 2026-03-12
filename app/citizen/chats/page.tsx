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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center">
          <MessageSquare size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Chat History</h1>
          <p className="text-sm text-slate-500">
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
            <Inbox size={28} className="text-amber-700" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No chat history yet</h3>
          <p className="text-sm text-slate-500 mb-6">
            Your AI conversations about grievances will appear here.
            Submit a complaint and chat with the AI assistant to get started.
          </p>
          <Link
            href="/citizen/complaints/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
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
              className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all p-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
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
                  className="text-slate-300 group-hover:text-amber-600 shrink-0 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
