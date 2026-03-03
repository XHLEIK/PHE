import React from 'react';
import { Users, LayoutList, Zap, Settings2 } from 'lucide-react';

const SystemLoadPanel = () => {
  const stats = [
    { label: 'Active Users', value: '14,204', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Queue Size', value: '182', icon: LayoutList, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Avg Response', value: '1.2s', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: 'Processing', value: '42%', icon: Settings2, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
  ];

  return (
    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">System Load Monitor</h3>
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`p-5 rounded-2xl border transition-all hover:shadow-md ${stat.bg} ${stat.border}`}>
            <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center mb-4 ${stat.color} shadow-sm`}>
              <stat.icon size={16} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{stat.label}</p>
            <h4 className={`text-xl font-black ${stat.color} tracking-tight`}>{stat.value}</h4>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-gray-50">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>CPU Utilization</span>
              <span>24%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: '24%' }}></div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              <span>Memory Usage</span>
              <span>68%</span>
            </div>
            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: '68%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemLoadPanel;
