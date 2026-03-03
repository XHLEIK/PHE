import React from 'react';
import AdminLoginForm from '@/components/admin/AdminLoginForm';

export const metadata = {
  title: 'Admin Login | Samadhan AI - APPSC Portal',
  description: 'Administrator authentication portal for the Samadhan AI Grievance System.',
};

const AdminLoginPage = () => {
  return (
    <main className="min-h-screen bg-[#faf7f0] flex items-center justify-center p-4 md:p-8 relative overflow-hidden font-sans">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#b45309 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      {/* Login Container */}
      <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-10">
        
        {/* LEFT SIDE: BRANDING (Hidden on Mobile) */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-amber-700 to-amber-900 relative overflow-hidden">
          {/* Abstract pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
             <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
               <path d="M0 100 C 20 0 50 0 100 100" fill="none" stroke="white" strokeWidth="0.2" />
               <path d="M0 80 C 30 20 60 20 100 80" fill="none" stroke="white" strokeWidth="0.2" />
               <path d="M0 60 C 40 40 70 40 100 60" fill="none" stroke="white" strokeWidth="0.2" />
             </svg>
          </div>

          <div className="z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight leading-tight">
              Samadhan AI<br /> 
              <span className="text-amber-200 text-2xl font-normal">State Grievance Portal</span>
            </h1>
            <p className="text-amber-100/80 mt-4 max-w-sm leading-relaxed">
              Managing citizen grievance redressal for Arunachal Pradesh with AI-driven classification and transparent governance.
            </p>
          </div>

          <div className="z-10 mt-12 pt-8 border-t border-white/20">
             <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
               <p className="text-xs font-medium text-amber-100 uppercase tracking-widest">
                 System Active &amp; Secured
               </p>
             </div>
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="bg-white p-8 md:p-12 lg:p-14 flex flex-col justify-center items-center lg:items-start">
          <div className="w-full max-w-[380px]">
            {/* Mobile Logo */}
            <div className="lg:hidden flex justify-center mb-8">
               <div className="w-14 h-14 bg-amber-700 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>
                  </svg>
               </div>
            </div>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome Back</h2>
              <p className="text-slate-500 text-sm">Sign in to the administration portal</p>
              <div className="h-1 w-10 bg-amber-700 rounded-full mt-4 mx-auto lg:ml-0"></div>
            </div>

            <AdminLoginForm />

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center lg:items-start gap-4">
               <button className="text-xs font-medium text-slate-400 hover:text-amber-700 transition-all flex items-center gap-2 group">
                 <span>Request Access Support</span>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
               </button>
               
               <div className="flex items-center gap-3 opacity-40">
                  <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">Govt. of Arunachal Pradesh</span>
                  <div className="w-1 h-1 bg-slate-400 rounded-full"></div>
                  <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider">APPSC</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default AdminLoginPage;
