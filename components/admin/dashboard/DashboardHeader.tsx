import React from 'react';

const DashboardHeader = () => {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 mb-6">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
        <span className="text-[11px] font-black uppercase tracking-widest">System Online</span>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight">
        Government Services Dashboard
      </h1>
      <p className="mt-4 text-lg text-gray-500 font-medium max-w-2xl mx-auto">
        Empowering efficient citizen service delivery through AI-driven grievance redressal.
      </p>
      
      <div className="mt-8 flex items-center gap-4 text-gray-400">
        <span className="text-xs font-bold uppercase tracking-widest">Last Updated: Today, 14:32</span>
        <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
        <span className="text-xs font-bold uppercase tracking-widest">Arunachal Pradesh Node 01</span>
      </div>
    </div>
  );
};

export default DashboardHeader;
