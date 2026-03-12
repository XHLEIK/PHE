'use client';

import React from 'react';

/** Pulsing bar skeleton */
export function SkeletonBar({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-slate-200 rounded animate-pulse ${className}`} style={style} />;
}

/** Stat card skeleton (for dashboard 4-card grid) */
export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBar className="h-8 w-8" />
        <SkeletonBar className="h-4 w-16" />
      </div>
      <SkeletonBar className="h-3 w-24" />
      <SkeletonBar className="h-7 w-16" />
    </div>
  );
}

/** Complaint list row skeleton */
export function ComplaintRowSkeleton() {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <SkeletonBar className="h-4 w-4" />
          <SkeletonBar className="h-5 w-2/3" />
        </div>
        <SkeletonBar className="h-6 w-20" />
      </div>
      <SkeletonBar className="h-3 w-full" />
      <div className="flex items-center gap-3">
        <SkeletonBar className="h-5 w-16" />
        <SkeletonBar className="h-5 w-24" />
        <SkeletonBar className="h-5 w-20" />
      </div>
    </div>
  );
}

/** Full-page table skeleton with header + rows */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <ComplaintRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Analytics chart placeholder skeleton */
export function ChartSkeleton({ className = 'h-64' }: { className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl p-5 ${className}`}>
      <SkeletonBar className="h-4 w-32 mb-4" />
      <div className="flex items-end gap-2 h-[calc(100%-2rem)]">
        {Array.from({ length: 7 }).map((_, i) => (
          <SkeletonBar
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

/** Summary card skeleton (for analytics overview) */
export function SummaryCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-2">
      <SkeletonBar className="h-3 w-20" />
      <SkeletonBar className="h-8 w-16" />
      <SkeletonBar className="h-3 w-28" />
    </div>
  );
}
