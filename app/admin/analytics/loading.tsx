import { ChartSkeleton, SummaryCardSkeleton } from '@/components/skeletons/Skeletons';

export default function Loading() {
  return (
    <div className="p-6 md:ml-64 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SummaryCardSkeleton key={i} />
        ))}
      </div>
      <ChartSkeleton />
    </div>
  );
}
