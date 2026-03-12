'use client';

import { useState, useEffect } from 'react';
import { updateAdminUser, resetAdminPassword } from '@/lib/api-client';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { ROLE_META, type AdminRole, getCreatableRoles, getRoleLevel } from '@/lib/rbac/client';

interface LocationScope {
  country?: string;
  state?: string;
  district?: string;
  block?: string;
  area?: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  departments: string[];
  isActive: boolean;
  phone?: string;
  locationScope?: LocationScope;
}

interface AdminUserModalProps {
  user: AdminUser;
  onClose: () => void;
  onUpdated: () => void;
  allDepartments: Array<{ id: string; label: string }>;
  editorRole?: string;
}

export default function AdminUserModal({
  user,
  onClose,
  onUpdated,
  allDepartments,
  editorRole = 'head_admin',
}: AdminUserModalProps) {
  const [tab, setTab] = useState<'edit' | 'reset'>('edit');
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [phone, setPhone] = useState(user.phone || '');
  const [departments, setDepartments] = useState<string[]>(user.departments);
  const [isActive, setIsActive] = useState(user.isActive);
  const [locationScope, setLocationScope] = useState<LocationScope>(user.locationScope || {});
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Roles the editor can assign (from CREATION_MATRIX)
  const assignableRoles = getCreatableRoles(editorRole);
  const selectedMeta = ROLE_META[role as AdminRole];

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data: Record<string, unknown> = {};
      if (name !== user.name) data.name = name;
      if (role !== user.role) data.role = role;
      if (phone !== (user.phone || '')) data.phone = phone;
      if (isActive !== user.isActive) data.isActive = isActive;
      if (JSON.stringify(departments) !== JSON.stringify(user.departments)) {
        data.departments = departments;
      }
      if (JSON.stringify(locationScope) !== JSON.stringify(user.locationScope || {})) {
        data.locationScope = locationScope;
      }

      if (Object.keys(data).length === 0) {
        setError('No changes to save');
        setLoading(false);
        return;
      }

      const res = await updateAdminUser(user._id, data);
      if (res.success) {
        setSuccess('User updated successfully');
        onUpdated();
      } else {
        setError(res.error || 'Update failed');
      }
    } catch {
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPassword.length < 12) {
      setError('Password must be at least 12 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await resetAdminPassword(user._id, tempPassword);
      if (res.success) {
        setSuccess('Password reset successfully. User must change it on next login.');
        setTempPassword('');
      } else {
        setError(res.error || 'Reset failed');
      }
    } catch {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (deptId: string) => {
    setDepartments((prev) =>
      prev.includes(deptId)
        ? prev.filter((d) => d !== deptId)
        : [...prev, deptId]
    );
  };

  const trapRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="presentation">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="user-modal-title" className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 id="user-modal-title" className="text-lg font-semibold text-slate-900">{user.name || user.email}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setTab('edit')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'edit'
                ? 'text-amber-700 border-b-2 border-amber-700'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Edit User
          </button>
          <button
            onClick={() => setTab('reset')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'reset'
                ? 'text-rose-600 border-b-2 border-rose-600'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Reset Password
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {tab === 'edit' ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {/* Keep current role as option even if not in assignableRoles */}
                  {!assignableRoles.includes(user.role as AdminRole) && (
                    <option value={user.role}>{ROLE_META[user.role as AdminRole]?.shortLabel || user.role} (current)</option>
                  )}
                  {assignableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_META[r].shortLabel} (Level {ROLE_META[r].level})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              {/* Departments — shown when role requires/allows them */}
              {selectedMeta && (selectedMeta.requiresDepartment || selectedMeta.departmentOptional) && (
                <div>
                  <label className="block text-sm text-slate-600 mb-2">
                    Departments {selectedMeta.requiresDepartment && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {allDepartments.map((dept) => (
                      <label
                        key={dept.id}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                          departments.includes(dept.id) ? 'bg-amber-50 border border-amber-300' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={departments.includes(dept.id)}
                          onChange={() => toggleDepartment(dept.id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500/20"
                        />
                        <span className="text-xs text-slate-700 truncate">{dept.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Location Scope */}
              {selectedMeta && selectedMeta.requiredLocationFields.length > 0 && (
                <div>
                  <label className="block text-sm text-slate-600 mb-2">Location Scope</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['country', 'state', 'district', 'block', 'area'] as const).map(field => {
                      const isRequired = selectedMeta.requiredLocationFields.includes(field);
                      if (!isRequired) return null;
                      return (
                        <div key={field} className="space-y-0.5">
                          <label className="text-[10px] font-medium text-slate-500 uppercase">{field}</label>
                          <input
                            type="text"
                            value={locationScope[field] || ''}
                            onChange={e => setLocationScope(p => ({ ...p, [field]: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500/20"
                  />
                  <span className="text-sm text-slate-600">Active</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-sm text-slate-500">
                Set a temporary password for <strong className="text-slate-800">{user.email}</strong>.
                They will be forced to change it on next login.
              </p>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  placeholder="Min 12 characters"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || tempPassword.length < 12}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}

          {error && (
            <div className="mt-3 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
