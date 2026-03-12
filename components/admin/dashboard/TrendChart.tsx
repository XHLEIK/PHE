'use client';

interface TrendChartProps {
  data: Array<{ date: string; count: number }>;
  height?: number;
  color?: string;
}

export default function TrendChart({
  data,
  height = 200,
  color = '#3b82f6',
}: TrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 text-sm"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const barWidth = Math.max(8, Math.min(40, (100 / data.length) * 0.7));
  const gap = Math.max(2, (100 - barWidth * data.length) / (data.length + 1));

  return (
    <div className="w-full" style={{ height }}>
      {/* Y-axis labels */}
      <div className="flex h-full">
        <div className="flex flex-col justify-between pr-2 text-right" style={{ width: 40 }}>
          <span className="text-[10px] text-gray-500">{maxCount}</span>
          <span className="text-[10px] text-gray-500">{Math.round(maxCount / 2)}</span>
          <span className="text-[10px] text-gray-500">0</span>
        </div>

        {/* Bars */}
        <div className="flex-1 flex items-end relative border-l border-b border-gray-700">
          {data.map((point, i) => {
            const barHeight = (point.count / maxCount) * 100;
            return (
              <div
                key={i}
                className="flex flex-col items-center justify-end group"
                style={{
                  width: `${barWidth}%`,
                  marginLeft: i === 0 ? `${gap}%` : `${gap}%`,
                  height: '100%',
                }}
              >
                {/* Tooltip */}
                <div className="hidden group-hover:block absolute -top-8 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-10 whitespace-nowrap">
                  {point.date}: {point.count}
                </div>

                {/* Bar */}
                <div
                  className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${Math.max(barHeight, 2)}%`,
                    backgroundColor: color,
                    minHeight: point.count > 0 ? 4 : 0,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* X-axis labels — show first, middle, last */}
      <div className="flex justify-between pl-10 mt-1">
        {data.length > 0 && (
          <>
            <span className="text-[10px] text-gray-500">
              {data[0].date.slice(5)}
            </span>
            {data.length > 2 && (
              <span className="text-[10px] text-gray-500">
                {data[Math.floor(data.length / 2)].date.slice(5)}
              </span>
            )}
            <span className="text-[10px] text-gray-500">
              {data[data.length - 1].date.slice(5)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
