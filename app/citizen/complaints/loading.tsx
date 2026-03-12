import { TableSkeleton } from '@/components/skeletons/Skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <TableSkeleton rows={6} />
    </div>
  );
}
