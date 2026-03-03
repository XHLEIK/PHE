import React from 'react';
import { Clock, BrainCircuit, ChevronRight, Terminal, Shield } from 'lucide-react';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'TRIAGE' | 'RESOLVED';
  time: string;
  department: string;
}

const ComplaintCard: React.FC<{ complaint: Complaint }> = ({ complaint }) => {
  const priorityClasses = {
    CRITICAL: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    HIGH: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    MEDIUM: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    LOW: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };

  const statusClasses = {
    PENDING: 'text-slate-500 bg-slate-500/5 border-white/5',
    TRIAGE: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    RESOLVED: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 backdrop-blur-md group hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
      {/* Dynamic Glow Effect */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-500 ${
        complaint.priority === 'CRITICAL' ? 'bg-rose-500 shadow-[4px_0_20px_rgba(244,63,94,0.3)]' : 'bg-emerald-500/20 group-hover:bg-emerald-500'
      }`}></div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-4">
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded border ${priorityClasses[complaint.priority as keyof typeof priorityClasses]}`}>
              {complaint.priority}
            </span>
            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded border ${statusClasses[complaint.status as keyof typeof statusClasses]}`}>
              {complaint.status}
            </span>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">
              <Clock size={12} />
              {complaint.time}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-black text-white tracking-tight group-hover:text-emerald-400 transition-colors mb-2">
              {complaint.title}
            </h4>
            <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
              {complaint.description}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 rounded-lg border border-white/5">
              <Shield size={12} className="text-slate-600" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{complaint.id}</span>
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.15em] italic">
              {complaint.department}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 min-w-[220px]">
          <div className="flex items-center gap-3 w-full">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 shadow-xl shadow-emerald-900/20 transition-all active:scale-[0.98]">
              <BrainCircuit size={16} />
              AI_DEBUG
            </button>
            <button className="flex items-center justify-center p-3 bg-slate-800 text-slate-400 rounded-xl hover:text-white transition-all border border-white/5">
              <Terminal size={18} />
            </button>
          </div>
          <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-emerald-400 transition-colors flex items-center gap-1 group/link">
            Trace_Packet
            <ChevronRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComplaintCard;
