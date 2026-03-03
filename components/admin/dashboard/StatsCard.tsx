import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
  color: 'amber' | 'blue' | 'emerald' | 'rose';
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  };

  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-rose-600' : 'text-gray-400';

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.05)] transition-all group">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
        <div className={`text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${trendColor} bg-opacity-10`}>
          {change}
        </div>
      </div>
      
      <p className="text-xs font-bold text-gray-400 uppercase tracking-[0.1em] mb-1">{title}</p>
      <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
    </div>
  );
};

export default StatsCard;
