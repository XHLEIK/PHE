'use client';

import { useState, useEffect } from 'react';
import { getActivityFeed } from '@/lib/api-client';

interface Activity {
  _id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface ActivityFeedProps {
  limit?: number;
  autoRefresh?: boolean;
}

const actionLabels: Record<string, { icon: string; label: string; color: string }> = {
  'complaint.created': { icon: '📝', label: 'Complaint created', color: 'text-blue-400' },
  'complaint.updated': { icon: '🔄', label: 'Complaint updated', color: 'text-yellow-400' },
  'complaint.assigned': { icon: '👤', label: 'Complaint assigned', color: 'text-purple-400' },
  'complaint.escalated': { icon: '⬆️', label: 'Complaint escalated', color: 'text-orange-400' },
  'complaint.note_added': { icon: '💬', label: 'Note added', color: 'text-gray-300' },
  'complaint.bulk_updated': { icon: '📦', label: 'Bulk update', color: 'text-cyan-400' },
  'user.created': { icon: '➕', label: 'User created', color: 'text-green-400' },
  'user.updated': { icon: '✏️', label: 'User updated', color: 'text-yellow-400' },
  'user.password_reset': { icon: '🔑', label: 'Password reset', color: 'text-red-400' },
  'department.admin_assigned': { icon: '🏢', label: 'Dept admin assigned', color: 'text-blue-400' },
  'department.admin_removed': { icon: '🏢', label: 'Dept admin removed', color: 'text-red-400' },
  'system.sla_breach_check': { icon: '⏰', label: 'SLA check', color: 'text-red-400' },
  'contact.revealed': { icon: '👁️', label: 'Contact revealed', color: 'text-amber-400' },
};

export default function ActivityFeed({ limit = 15, autoRefresh = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const res = await getActivityFeed({ limit });
      if (res.success && res.data) {
        setActivities(res.data as unknown as Activity[]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    if (autoRefresh) {
      const interval = setInterval(fetchActivities, 60000);
      return () => clearInterval(interval);
    }
  }, [limit, autoRefresh]);

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getActionInfo = (action: string) =>
    actionLabels[action] || { icon: '📌', label: action, color: 'text-gray-400' };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
        <button
          onClick={fetchActivities}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Refresh
        </button>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">No recent activity</div>
        ) : (
          activities.map((activity) => {
            const info = getActionInfo(activity.action);
            return (
              <div
                key={activity._id}
                className="px-4 py-3 border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">{info.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        {timeAgo(activity.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      by {activity.actor}
                      {activity.metadata && !!(activity.metadata as Record<string, unknown>).trackingId && (
                        <span className="ml-1 font-mono">
                          · {String((activity.metadata as Record<string, unknown>).trackingId)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
