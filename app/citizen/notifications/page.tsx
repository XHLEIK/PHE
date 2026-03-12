'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, CheckCircle2, AlertTriangle, ArrowRight, Loader2,
  Building2, ShieldAlert, Clock, FileText, CheckCheck,
} from 'lucide-react';
import {
  getCitizenNotifications,
  markCitizenNotificationsRead,
  markAllCitizenNotificationsRead,
  type CitizenNotification,
} from '@/lib/citizen-api-client';

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  status_change: {
    icon: <Clock size={16} />,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
  department_assigned: {
    icon: <Building2 size={16} />,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
  priority_change: {
    icon: <ShieldAlert size={16} />,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  sla_warning: {
    icon: <AlertTriangle size={16} />,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
  },
  sla_breach: {
    icon: <AlertTriangle size={16} />,
    color: 'text-red-600 bg-red-50 border-red-200',
  },
  comment_added: {
    icon: <FileText size={16} />,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  },
  resolved: {
    icon: <CheckCircle2 size={16} />,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  system: {
    icon: <Bell size={16} />,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function CitizenNotificationsPage() {
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await getCitizenNotifications({ page: p, limit: 20 });
      if (res.success && res.data) {
        setNotifications(res.data);
        setTotalPages(res.meta?.totalPages || 1);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllCitizenNotificationsRead();
      setNotifications(prev =>
        prev.map(n => (n.isRead ? n : { ...n, isRead: true, readAt: new Date().toISOString() }))
      );
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markCitizenNotificationsRead([id]);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
    } catch {
      // ignore
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell size={22} className="text-amber-700" />
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Stay updated on your grievance progress</p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-60 transition-colors"
          >
            {markingAll ? <Loader2 size={12} className="animate-spin" /> : <CheckCheck size={12} />}
            Mark all read
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading notifications…
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-2xl mb-4">
            <Bell size={28} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">No Notifications Yet</h3>
          <p className="text-sm text-slate-400">
            You&apos;ll receive updates here when your grievances are reviewed.
          </p>
        </div>
      )}

      {/* Notification list */}
      {!loading && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            return (
              <div
                key={n._id}
                className={`relative bg-white rounded-xl border p-4 transition-all ${
                  n.isRead
                    ? 'border-slate-100 opacity-75'
                    : 'border-amber-200 shadow-sm'
                }`}
              >
                {/* Unread dot */}
                {!n.isRead && (
                  <span className="absolute top-4 right-4 w-2 h-2 bg-amber-500 rounded-full" />
                )}

                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${cfg.color}`}>
                    {cfg.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-semibold text-slate-800 truncate">{n.title}</h3>
                      <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{n.message}</p>

                    <div className="flex items-center gap-3 mt-2">
                      {n.relatedComplaintTrackingId && (
                        <Link
                          href={`/citizen/complaints/${n.relatedComplaintId}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                        >
                          {n.relatedComplaintTrackingId} <ArrowRight size={10} />
                        </Link>
                      )}
                      {!n.isRead && (
                        <button
                          onClick={() => handleMarkRead(n._id)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg disabled:opacity-40 hover:bg-slate-200 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs text-slate-400">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg disabled:opacity-40 hover:bg-slate-200 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
