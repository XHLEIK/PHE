'use client';

import React from 'react';
import { FileText, Search, Bell, FolderOpen, Inbox } from 'lucide-react';

type Variant = 'complaints' | 'search' | 'notifications' | 'general' | 'folder';

const ICONS: Record<Variant, React.ElementType> = {
  complaints: FileText,
  search: Search,
  notifications: Bell,
  general: Inbox,
  folder: FolderOpen,
};

const DEFAULTS: Record<Variant, { title: string; description: string }> = {
  complaints: {
    title: 'No grievances found',
    description: 'There are no complaints matching your current filters.',
  },
  search: {
    title: 'No results',
    description: 'Try adjusting your search query or filters.',
  },
  notifications: {
    title: 'All caught up!',
    description: 'You have no new notifications at this time.',
  },
  general: {
    title: 'Nothing here yet',
    description: 'Content will appear here once available.',
  },
  folder: {
    title: 'Empty folder',
    description: 'No items in this category.',
  },
};

interface EmptyStateProps {
  variant?: Variant;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  variant = 'general',
  title,
  description,
  action,
}: EmptyStateProps) {
  const Icon = ICONS[variant];
  const defaults = DEFAULTS[variant];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={28} className="text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">
        {title || defaults.title}
      </h3>
      <p className="text-sm text-slate-400 max-w-xs mb-4">
        {description || defaults.description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
