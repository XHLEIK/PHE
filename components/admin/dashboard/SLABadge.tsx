'use client';

interface SLABadgeProps {
  slaDeadline?: string | null;
  slaBreached?: boolean;
  status?: string;
}

export default function SLABadge({ slaDeadline, slaBreached = false }: SLABadgeProps) {
  if (!slaDeadline) return null;

  if (slaBreached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/30">
        🔴 SLA Breached
      </span>
    );
  }

  const deadline = new Date(slaDeadline);
  const now = new Date();
  const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-medium rounded-full border border-red-500/30">
        🔴 SLA Overdue
      </span>
    );
  }

  if (hoursRemaining <= 24) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-medium rounded-full border border-orange-500/30">
        ⚠️ &lt;{Math.ceil(hoursRemaining)}h
      </span>
    );
  }

  const daysRemaining = Math.ceil(hoursRemaining / 24);
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
      ✅ {daysRemaining}d left
    </span>
  );
}
