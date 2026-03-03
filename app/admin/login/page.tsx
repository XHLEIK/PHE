import React from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export const metadata = {
  title: 'Secure Admin Access | APPSC Portal',
  description: 'Administrator authentication portal for the APPSC Redressal System.',
};

const AdminLoginPage = () => {
  return (
    <main className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* --- VIBRANT BACKGROUND ELEMENTS --- */}
      {/* Primary Mesh Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* --- LOGIN CONTAINER --- */}
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden z-10">
        
        {/* LEFT SIDE: BRANDING & VISUAL (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
          {/* Abstract pattern inside the blue side */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
             <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
               <path d="M0 100 C 20 0 50 0 100 100" fill="none" stroke="white" strokeWidth="0.1" />
               <path d="M0 80 C 30 20 60 20 100 80" fill="none" stroke="white" strokeWidth="0.1" />
               <path d="M0 60 C 40 40 70 40 100 60" fill="none" stroke="white" strokeWidth="0.1" />
             </svg>
          </div>

          <div className="z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
              Next-Gen <br /> 
              <span className="text-indigo-200">Admin Control.</span>
            </h1>
            <p className="text-indigo-100/70 mt-4 max-w-sm font-medium leading-relaxed">
              Managing the future of candidate grievance redressal with precision, AI-driven insights, and secure governance.
            </p>
          </div>

          <div className="z-10 mt-12 pt-12 border-t border-white/10">
             <div className="flex items-center gap-4">
               <div className="flex -space-x-3">
                 {[1,2,3].map(i => (
                   <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-500 bg-indigo-400/50 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold text-white uppercase">OP</div>
                 ))}
               </div>
               <p className="text-[11px] font-bold text-indigo-100 uppercase tracking-widest">
                 System Active & Secured
               </p>
             </div>
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="bg-white p-8 md:p-12 lg:p-16 flex flex-col justify-center items-center lg:items-start">
          <div className="w-full max-w-[380px]">
            {/* Mobile Logo Only */}
            <div className="lg:hidden flex justify-center mb-8">
               <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
                  </svg>
               </div>
            </div>

            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Login.</h2>
              <p className="text-slate-400 font-bold text-sm tracking-wide uppercase">Administrative Access Portal</p>
              <div className="h-1.5 w-12 bg-indigo-600 rounded-full mt-4 mx-auto lg:ml-0"></div>
            </div>

            <AdminLoginForm />

            <div className="mt-10 pt-8 border-t border-slate-50 flex flex-col items-center lg:items-start gap-6">
               <button className="text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all uppercase tracking-widest flex items-center gap-2 group">
                 <span>Request Access Support</span>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
               </button>
               
               <div className="flex items-center gap-3 opacity-30 grayscale pointer-events-none">
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Gov. Arunachal Pradesh</span>
                  <div className="w-1 h-1 bg-slate-900 rounded-full"></div>
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-[0.2em]">Secure Node 01</span>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Indicator (Bottom Left) */}
      <div className="absolute bottom-8 left-8 hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 z-20">
         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
         <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Portal Health: Optimal</span>
      </div>
    </main>
  );
};

export default AdminLoginPage;
