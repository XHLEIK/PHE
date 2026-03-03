'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { UserPlus, Shield, Lock, BellRing, Database, ChevronRight, KeyRound } from 'lucide-react';
import { getAdminUsers, createAdminUser, rotatePassword } from '@/lib/api-client';
import { getDevAdmins, getDevSystemConfigs } from '@/lib/dev-fixtures';

interface AdminUser {
  name: string;
  email: string;
  level: string;
  active: boolean;
}

const SettingsPage = () => {
  const searchParams = useSearchParams();
  const showRotatePrompt = searchParams.get('rotatePassword') === 'true';

  const [isAdding, setIsAdding] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // New admin form
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', securityLevel: 1, temporaryPassword: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password rotation
  const [showRotate, setShowRotate] = useState(showRotatePrompt);
  const [rotateForm, setRotateForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [rotateError, setRotateError] = useState('');
  const [rotateSuccess, setRotateSuccess] = useState('');
  const [rotating, setRotating] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      const result = await getAdminUsers();
      if (result.success && result.data) {
        const mapped: AdminUser[] = (result.data as Array<Record<string, unknown>>).map((u) => ({
          name: (u.name as string) || '',
          email: (u.email as string) || '',
          level: `Level ${(u.securityLevel as number) || 1}`,
          active: !!(u.lastLoginAt),
        }));
        setAdmins(mapped);
      } else {
        setAdmins(getDevAdmins());
      }
    } catch {
      setAdmins(getDevAdmins());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleCreateAdmin = async () => {
    setFormError('');
    setFormSuccess('');
    if (!newAdmin.name || !newAdmin.email || !newAdmin.temporaryPassword) {
      setFormError('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const result = await createAdminUser(newAdmin);
      if (result.success) {
        setFormSuccess('Administrator created successfully. They must change password on first login.');
        setNewAdmin({ name: '', email: '', securityLevel: 1, temporaryPassword: '' });
        fetchAdmins();
      } else {
        setFormError(result.error || 'Failed to create administrator');
      }
    } catch {
      setFormError('Network error. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRotatePassword = async () => {
    setRotateError('');
    setRotateSuccess('');
    if (rotateForm.newPwd !== rotateForm.confirm) {
      setRotateError('New passwords do not match');
      return;
    }
    if (rotateForm.newPwd.length < 12) {
      setRotateError('Password must be at least 12 characters');
      return;
    }
    setRotating(true);
    try {
      const result = await rotatePassword(rotateForm.current, rotateForm.newPwd);
      if (result.success) {
        setRotateSuccess('Password updated successfully.');
        setRotateForm({ current: '', newPwd: '', confirm: '' });
        setShowRotate(false);
      } else {
        setRotateError(result.error || 'Failed to rotate password');
      }
    } catch {
      setRotateError('Network error. Try again.');
    } finally {
      setRotating(false);
    }
  };

  const systemConfigs = getDevSystemConfigs();

  return (
    <div className="min-h-screen bg-[#0F172A] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-8 space-y-12">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase italic">Control_Panel</h1>
            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-[0.2em] mt-2">Core System Configuration & Access Management</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Form & Access */}
            <div className="xl:col-span-2 space-y-8">

              {/* Password Rotation Card (shown when required or toggled) */}
              {showRotate && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-[2rem] backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                      <KeyRound size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white tracking-tight uppercase">Password Rotation Required</h3>
                      <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mt-1">You must change your password before proceeding</p>
                    </div>
                  </div>
                  {rotateError && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{rotateError}</div>}
                  {rotateSuccess && <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">{rotateSuccess}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Current Password</label>
                      <input type="password" value={rotateForm.current} onChange={e => setRotateForm(p => ({ ...p, current: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Password (12+ chars)</label>
                      <input type="password" value={rotateForm.newPwd} onChange={e => setRotateForm(p => ({ ...p, newPwd: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                      <input type="password" value={rotateForm.confirm} onChange={e => setRotateForm(p => ({ ...p, confirm: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-amber-500/50 transition-all" />
                    </div>
                  </div>
                  <button onClick={handleRotatePassword} disabled={rotating} className="px-8 py-3 bg-amber-500 text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 transition-all disabled:opacity-50">
                    {rotating ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              )}
              
              {/* Access Control Card */}
              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] backdrop-blur-md">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <Shield size={20} className="text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-black text-white tracking-tight uppercase">Administrative Access Control</h3>
                  </div>
                  <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
                  >
                    <UserPlus size={16} />
                    Add New Administrator
                  </button>
                </div>

                {/* Add Admin Form (Collapsible) */}
                {isAdding && (
                  <div className="mb-10 p-6 bg-slate-950/50 rounded-2xl border border-emerald-500/10 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 italic">Initialize New Security Protocol</h4>
                    {formError && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{formError}</div>}
                    {formSuccess && <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400">{formSuccess}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                        <input type="text" placeholder="e.g. Tsering Lhamo" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Official Email</label>
                        <input type="email" placeholder="admin@appsc.gov.in" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Security Clearance</label>
                        <select value={newAdmin.securityLevel} onChange={e => setNewAdmin(p => ({ ...p, securityLevel: Number(e.target.value) }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-slate-400 focus:outline-none focus:border-emerald-500/50 transition-all appearance-none">
                          <option value={1}>Level 1 - Junior IT</option>
                          <option value={2}>Level 2 - Senior Analyst</option>
                          <option value={3}>Level 3 - Department Head</option>
                          <option value={4}>Level 4 - Root Administrator</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Temporary Password</label>
                        <input type="password" placeholder="Min 12 characters" value={newAdmin.temporaryPassword} onChange={e => setNewAdmin(p => ({ ...p, temporaryPassword: e.target.value }))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500/50 transition-all" />
                      </div>
                    </div>
                    <div className="mt-6">
                      <button onClick={handleCreateAdmin} disabled={submitting} className="w-full md:w-auto px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50">
                        {submitting ? 'Creating…' : 'Generate Credentials'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Current Admins List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Authorized Personnel</h4>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 bg-slate-950/30 rounded-2xl border border-white/5 animate-pulse h-16" />
                    ))
                  ) : (
                    admins.map((admin) => (
                    <div key={admin.email} className="flex items-center justify-between p-4 bg-slate-950/30 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-black text-[10px] text-emerald-500">
                           {admin.name.substring(0, 2).toUpperCase()}
                         </div>
                         <div>
                           <p className="text-sm font-black text-white leading-none mb-1">{admin.name}</p>
                           <p className="text-[10px] font-medium text-slate-500">{admin.email}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">
                           {admin.level}
                         </span>
                         <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${admin.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{admin.active ? 'Online' : 'Offline'}</span>
                         </div>
                         <button className="p-2 text-slate-700 hover:text-white transition-colors">
                           <ChevronRight size={16} />
                         </button>
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: System Config */}
            <div className="space-y-8">
               <div className="bg-slate-900/40 border border-white/5 p-8 rounded-[2rem] backdrop-blur-md space-y-8">
                  <h3 className="text-sm font-black text-white tracking-widest uppercase mb-6 flex items-center gap-2">
                    <Database size={18} className="text-emerald-500" />
                    Samadhan Kernel
                  </h3>
                  
                  {[
                    { label: 'Security Protocols', icon: Lock, status: 'Enabled' },
                    { label: 'Notification Sync', icon: BellRing, status: '98% Signal' },
                    { label: 'Cloud Sync', icon: Database, status: 'Synchronized' },
                    ...(!showRotate ? [{ label: 'Rotate Password', icon: KeyRound, status: 'CHANGE' }] : []),
                  ].map(item => (
                    <div key={item.label} onClick={() => { if (item.label === 'Rotate Password') setShowRotate(true); }} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-950 rounded-lg border border-white/5 group-hover:border-emerald-500/20 transition-all">
                           <item.icon size={14} className="text-slate-500 group-hover:text-emerald-500" />
                         </div>
                         <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">{item.status}</span>
                    </div>
                  ))}

                  <div className="pt-8 mt-8 border-t border-white/5">
                     <button className="w-full py-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5">
                       EMERGENCY_SYSTEM_LOCK
                     </button>
                     <p className="text-[9px] font-bold text-slate-600 text-center mt-4 uppercase tracking-widest">Only Level 4 Personnel Access</p>
                  </div>
               </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default SettingsPage;
