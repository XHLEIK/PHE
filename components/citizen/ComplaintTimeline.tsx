'use client';

import React from 'react';
import {
  CheckCircle2, Clock, ArrowUpRight, BrainCircuit,
  AlertTriangle, FileText, MessageSquare,
} from 'lucide-react';

interface TimelineEvent {
  id: string;
  action: string;
  label: string;
  description: string;
  type: 'created' | 'updated' | 'resolved' | 'escalated' | 'ai';
  timestamp: string;
  reason?: string;
  comment?: string;
}

interface ComplaintTimelineProps {
  events: TimelineEvent[];
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; dotColor: string; lineColor: string }> = {
  created: {
    icon: <FileText size={14} />,
    dotColor: 'bg-slate-500 text-white',
    lineColor: 'border-slate-300',
  },
  updated: {
    icon: <Clock size={14} />,
    dotColor: 'bg-blue-500 text-white',
    lineColor: 'border-blue-300',
  },
  resolved: {
    icon: <CheckCircle2 size={14} />,
    dotColor: 'bg-emerald-500 text-white',
    lineColor: 'border-emerald-300',
  },
  escalated: {
    icon: <AlertTriangle size={14} />,
    dotColor: 'bg-rose-500 text-white',
    lineColor: 'border-rose-300',
  },
  ai: {
    icon: <BrainCircuit size={14} />,
    dotColor: 'bg-amber-500 text-white',
    lineColor: 'border-amber-300',
  },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ComplaintTimeline: React.FC<ComplaintTimelineProps> = ({ events }) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-400">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event, index) => {
        const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.updated;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div className={`absolute left-[15px] top-8 bottom-0 w-px border-l-2 border-dashed ${cfg.lineColor}`} />
            )}

            {/* Dot */}
            <div className={`relative z-10 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.dotColor} shadow-sm`}>
              {cfg.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-semibold text-slate-800">{event.label}</h4>
                <span className="text-[10px] text-slate-400">{formatDate(event.timestamp)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{event.description}</p>

              {event.reason && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <ArrowUpRight size={12} className="mt-0.5 shrink-0 text-slate-400" />
                  <span><strong>Reason:</strong> {event.reason}</span>
                </div>
              )}

              {event.comment && (
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
                  <MessageSquare size={12} className="mt-0.5 shrink-0 text-amber-500" />
                  <span>{event.comment}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComplaintTimeline;
