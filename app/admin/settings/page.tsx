'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/admin/dashboard/Sidebar';
import Topbar from '@/components/admin/dashboard/Topbar';
import { UserPlus, Shield, Lock, BellRing, Database, ChevronRight, KeyRound, Building2 } from 'lucide-react';
import { getAdminUsers, createAdminUser, rotatePassword, getMe } from '@/lib/api-client';
import { DEPARTMENTS } from '@/lib/constants';

interface AdminUser {
  name: string;
  email: string;
  role: string;
  departments: string[];
  active: boolean;
}

const ALL_ROLE_OPTIONS = [
  { value: 'head_admin', label: 'Head Administrator', desc: 'Full system access with user management', needsDept: false },
  { value: 'department_admin', label: 'Department Admin', desc: 'Access limited to assigned departments only', needsDept: true },
  { value: 'staff', label: 'Staff', desc: 'Departmental staff with limited access', needsDept: true },
];

const SettingsPageInner = () => {
  const searchParams = useSearchParams();
  const showRotatePrompt = searchParams.get('rotatePassword') === 'true';

  const [isAdding, setIsAdding] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('staff');
  const [currentUserDepts, setCurrentUserDepts] = useState<string[]>([]);

  // New admin form
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    temporaryPassword: '',
    role: 'staff' as 'head_admin' | 'department_admin' | 'staff',
    departments: [] as string[],
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Password rotation
  const [showRotate, setShowRotate] = useState(showRotatePrompt);
  const [rotateForm, setRotateForm] = useState({ current: '', newPwd: '', confirm: '' });
  const [rotateError, setRotateError] = useState('');
  const [rotateSuccess, setRotateSuccess] = useState('');
  const [rotating, setRotating] = useState(false);

  const activeDepts = DEPARTMENTS.filter(d => d.active);

  // Role options depend on current user's role
  const ROLE_OPTIONS = currentUserRole === 'head_admin'
    ? ALL_ROLE_OPTIONS
    : ALL_ROLE_OPTIONS.filter(r => r.value === 'staff'); // department_admin can only create staff

  // Departments available for assignment depend on current user's role
  const assignableDepts = currentUserRole === 'head_admin'
    ? activeDepts
    : activeDepts.filter(d => currentUserDepts.includes(d.id));

  const fetchCurrentUser = useCallback(async () => {
    try {
      const result = await getMe();
      if (result.success && result.data) {
        const user = result.data.user as Record<string, unknown>;
        setCurrentUserRole((user.role as string) || 'staff');
        setCurrentUserDepts((user.departments as string[]) || []);
      }
    } catch {
      // defaults
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const result = await getAdminUsers();
      if (result.success && result.data) {
        const mapped: AdminUser[] = (result.data as Array<Record<string, unknown>>).map((u) => ({
          name: (u.name as string) || '',
          email: (u.email as string) || '',
          role: (u.role as string) || 'staff',
          departments: (u.departments as string[]) || [],
          active: !!(u.lastLoginAt),
        }));
        setAdmins(mapped);
      }
    } catch {
      // API unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrentUser(); fetchAdmins(); }, [fetchCurrentUser, fetchAdmins]);

  const toggleDepartment = (deptId: string) => {
    setNewAdmin(prev => ({
      ...prev,
      departments: prev.departments.includes(deptId)
        ? prev.departments.filter(d => d !== deptId)
        : [...prev.departments, deptId],
    }));
  };

  const handleCreateAdmin = async () => {
    setFormError('');
    setFormSuccess('');
    if (!newAdmin.name || !newAdmin.email || !newAdmin.temporaryPassword) {
      setFormError('Name, email, and temporary password are required');
      return;
    }
    if ((newAdmin.role === 'department_admin' || newAdmin.role === 'staff') && newAdmin.departments.length === 0) {
      setFormError('Please select at least one department for this role');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: newAdmin.name,
        email: newAdmin.email,
        temporaryPassword: newAdmin.temporaryPassword,
        role: newAdmin.role,
        ...((newAdmin.role === 'department_admin' || newAdmin.role === 'staff') ? { departments: newAdmin.departments } : {}),
      };
      const result = await createAdminUser(payload);
      if (result.success) {
        setFormSuccess('Administrator created successfully. They must change password on first login.');
        setNewAdmin({ name: '', email: '', temporaryPassword: '', role: 'staff', departments: [] });
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

  const getRoleLabel = (role: string) => {
    const opt = ALL_ROLE_OPTIONS.find(r => r.value === role);
    return opt?.label || role;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'head_admin': return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'department_admin': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'staff': return 'text-slate-700 bg-slate-50 border-slate-200';
      default: return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f0] flex font-sans">
      <Sidebar />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden">
        <Topbar />
        
        <main className="p-6 md:p-8 space-y-8">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
            <p className="text-sm text-slate-500 mt-1">System configuration and access management</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            
            {/* Left Column: Form & Access */}
            <div className="xl:col-span-2 space-y-8">

              {/* Password Rotation Card */}
              {showRotate && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-100 rounded-lg">
                      <KeyRound size={20} className="text-amber-700" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">Password Change Required</h3>
                      <p className="text-xs text-amber-700 mt-0.5">You must change your password before proceeding</p>
                    </div>
                  </div>
                  {rotateError && <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{rotateError}</div>}
                  {rotateSuccess && <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{rotateSuccess}</div>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Current Password</label>
                      <input type="password" value={rotateForm.current} onChange={e => setRotateForm(p => ({ ...p, current: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">New Password (12+ chars)</label>
                      <input type="password" value={rotateForm.newPwd} onChange={e => setRotateForm(p => ({ ...p, newPwd: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600">Confirm New Password</label>
                      <input type="password" value={rotateForm.confirm} onChange={e => setRotateForm(p => ({ ...p, confirm: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                    </div>
                  </div>
                  <button onClick={handleRotatePassword} disabled={rotating} className="px-6 py-2.5 bg-amber-700 text-white rounded-lg font-medium text-sm hover:bg-amber-800 transition-all disabled:opacity-50">
                    {rotating ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              )}
              
              {/* Access Control Card */}
              <div className="bg-white border border-slate-200 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <Shield size={20} className="text-amber-700" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">Administrative Access Control</h3>
                  </div>
                  <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-700 text-white rounded-lg font-medium text-sm hover:bg-amber-800 transition-all"
                  >
                    <UserPlus size={16} />
                    Add Administrator
                  </button>
                </div>

                {/* Add Admin Form (Collapsible) */}
                {isAdding && (
                  <div className="mb-6 p-5 bg-slate-50 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-semibold text-slate-700 mb-4">Create New Administrator</h4>
                    {formError && <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">{formError}</div>}
                    {formSuccess && <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{formSuccess}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Full Name</label>
                        <input type="text" placeholder="e.g. Tsering Lhamo" value={newAdmin.name} onChange={e => setNewAdmin(p => ({ ...p, name: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Official Email</label>
                        <input type="email" placeholder="admin@appsc.gov.in" value={newAdmin.email} onChange={e => setNewAdmin(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                      </div>

                      {/* Role Selection */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-medium text-slate-600">Administrator Role</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {ROLE_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setNewAdmin(p => ({ ...p, role: opt.value as typeof p.role, departments: opt.needsDept ? p.departments : [] }))}
                              className={`p-3 rounded-lg border text-left transition-all ${
                                newAdmin.role === opt.value
                                  ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500/20'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <p className={`text-xs font-semibold ${newAdmin.role === opt.value ? 'text-amber-800' : 'text-slate-700'}`}>{opt.label}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Department Checklist — shown for Department Admin & Staff */}
                      {(newAdmin.role === 'department_admin' || newAdmin.role === 'staff') && (
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                            <Building2 size={12} className="text-amber-700" />
                            Assign Departments <span className="text-slate-400 font-normal">({newAdmin.departments.length} selected)</span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 max-h-52 overflow-y-auto p-3 bg-white border border-slate-200 rounded-lg">
                            {assignableDepts.map(dept => (
                              <label
                                key={dept.id}
                                className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all text-xs ${
                                  newAdmin.departments.includes(dept.id)
                                    ? 'bg-amber-50 border border-amber-300 text-amber-800 font-medium'
                                    : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={newAdmin.departments.includes(dept.id)}
                                  onChange={() => toggleDepartment(dept.id)}
                                  className="w-3.5 h-3.5 text-amber-600 border-slate-300 rounded focus:ring-amber-500/20"
                                />
                                {dept.label}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600">Temporary Password</label>
                        <input type="password" placeholder="Min 12 characters" value={newAdmin.temporaryPassword} onChange={e => setNewAdmin(p => ({ ...p, temporaryPassword: e.target.value }))} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <button onClick={handleCreateAdmin} disabled={submitting} className="px-6 py-2.5 bg-amber-700 text-white rounded-lg font-medium text-sm hover:bg-amber-800 transition-all disabled:opacity-50">
                        {submitting ? 'Creating…' : 'Create Administrator'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Current Admins List */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 mb-3">Registered Administrators</h4>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-200 animate-pulse h-16" />
                    ))
                  ) : admins.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-400">No administrators found</div>
                  ) : (
                    admins.map((admin) => (
                    <div key={admin.email} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100 group hover:border-amber-200 transition-all">
                      <div className="flex items-center gap-3">
                         <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center font-semibold text-xs text-amber-800">
                           {admin.name.substring(0, 2).toUpperCase()}
                         </div>
                         <div>
                           <p className="text-sm font-semibold text-slate-800 leading-none mb-1">{admin.name}</p>
                           <div className="flex items-center gap-2">
                             <p className="text-xs text-slate-500">{admin.email}</p>
                             {(admin.role === 'department_admin' || admin.role === 'staff') && admin.departments.length > 0 && (
                               <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                 {admin.departments.length} dept{admin.departments.length > 1 ? 's' : ''}
                               </span>
                             )}
                           </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={`text-[10px] font-semibold px-2 py-1 rounded border ${getRoleBadge(admin.role)}`}>
                           {getRoleLabel(admin.role)}
                         </span>
                         <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${admin.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                            <span className="text-xs text-slate-500">{admin.active ? 'Active' : 'Inactive'}</span>
                         </div>
                         <button className="p-1.5 text-slate-400 hover:text-amber-700 transition-colors">
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
            <div className="space-y-4">
               <div className="bg-white border border-slate-200 p-5 rounded-xl space-y-5">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Database size={18} className="text-amber-700" />
                    System Configuration
                  </h3>
                  
                  {[
                    { label: 'Security Protocols', icon: Lock, status: 'Enabled' },
                    { label: 'Notification Sync', icon: BellRing, status: 'Active' },
                    { label: 'Cloud Sync', icon: Database, status: 'Synchronized' },
                    ...(!showRotate ? [{ label: 'Change Password', icon: KeyRound, status: 'Update' }] : []),
                  ].map(item => (
                    <div key={item.label} onClick={() => { if (item.label === 'Change Password') setShowRotate(true); }} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 group-hover:border-amber-300 transition-all">
                           <item.icon size={14} className="text-slate-400 group-hover:text-amber-700" />
                         </div>
                         <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-600">{item.status}</span>
                    </div>
                  ))}

                  <div className="pt-4 mt-4 border-t border-slate-100">
                     <button className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg font-medium text-xs hover:bg-rose-600 hover:text-white transition-all">
                       Emergency System Lock
                     </button>
                     <p className="text-[10px] text-slate-400 text-center mt-2">Head Administrator access only</p>
                  </div>
               </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <Suspense fallback={<div className="min-h-screen bg-[#faf7f0]" />}>
    <SettingsPageInner />
  </Suspense>
);

export default SettingsPage;
