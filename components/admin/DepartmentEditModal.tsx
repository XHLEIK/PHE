'use client';

import { useState, useEffect } from 'react';
import { getDepartmentAdmins, assignDepartmentAdmin, removeDepartmentAdmin } from '@/lib/api-client';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface DeptAdmin {
  _id: string;
  name: string;
  email: string;
  role: string;
  departments: string[];
}

interface DepartmentEditModalProps {
  department: {
    id: string;
    label: string;
    description: string;
    sla_days: number;
    escalation_level: number;
    active: boolean;
  };
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}

export default function DepartmentEditModal({
  department,
  onClose,
  onSave,
}: DepartmentEditModalProps) {
  const [tab, setTab] = useState<'settings' | 'admins'>('settings');
  const [label, setLabel] = useState(department.label);
  const [description, setDescription] = useState(department.description);
  const [slaDays, setSlaDays] = useState(department.sla_days);
  const [escalationLevel, setEscalationLevel] = useState(department.escalation_level);
  const [active, setActive] = useState(department.active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Admin management
  const [admins, setAdmins] = useState<DeptAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updates: Record<string, unknown> = {};
      if (label !== department.label) updates.label = label;
      if (description !== department.description) updates.description = description;
      if (slaDays !== department.sla_days) updates.sla_days = slaDays;
      if (escalationLevel !== department.escalation_level) updates.escalation_level = escalationLevel;
      if (active !== department.active) updates.active = active;

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setLoading(false);
        return;
      }

      await onSave(updates);
      setSuccess('Department updated');
    } catch {
      setError('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    setAdminsLoading(true);
    try {
      const res = await getDepartmentAdmins(department.id);
      if (res.success && res.data) {
        setAdmins(res.data.admins as unknown as DeptAdmin[]);
      }
    } catch {
      // silent
    } finally {
      setAdminsLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setError('');
    try {
      const res = await assignDepartmentAdmin(department.id, newAdminEmail.trim());
      if (res.success) {
        setNewAdminEmail('');
        fetchAdmins();
      } else {
        setError(res.error || 'Failed to assign admin');
      }
    } catch {
      setError('Failed to assign admin');
    }
  };

  const handleRemoveAdmin = async (email: string) => {
    setError('');
    try {
      const res = await removeDepartmentAdmin(department.id, email);
      if (res.success) {
        fetchAdmins();
      } else {
        setError(res.error || 'Failed to remove admin');
      }
    } catch {
      setError('Failed to remove admin');
    }
  };

  const handleTabChange = (newTab: 'settings' | 'admins') => {
    setTab(newTab);
    if (newTab === 'admins' && admins.length === 0) {
      fetchAdmins();
    }
  };

  const trapRef = useFocusTrap<HTMLDivElement>();

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="presentation">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="dept-modal-title" className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 id="dept-modal-title" className="text-lg font-semibold text-white">{department.label}</h2>
            <p className="text-xs text-gray-400 font-mono">{department.id}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => handleTabChange('settings')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'settings'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => handleTabChange('admins')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'admins'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Admins
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {tab === 'settings' ? (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">SLA (days)</label>
                  <input
                    type="number"
                    value={slaDays}
                    onChange={(e) => setSlaDays(parseInt(e.target.value) || 0)}
                    min={1}
                    max={90}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Escalation Level</label>
                  <input
                    type="number"
                    value={escalationLevel}
                    onChange={(e) => setEscalationLevel(parseInt(e.target.value) || 1)}
                    min={1}
                    max={5}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Active</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Add admin */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@email.com"
                  className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                />
                <button
                  onClick={handleAddAdmin}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg"
                >
                  Add
                </button>
              </div>

              {/* Admins list */}
              {adminsLoading ? (
                <div className="text-center text-gray-400 text-sm py-4">Loading...</div>
              ) : admins.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">No admins assigned</div>
              ) : (
                <div className="space-y-2">
                  {admins.map((admin) => (
                    <div
                      key={admin._id}
                      className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2.5"
                    >
                      <div>
                        <div className="text-sm text-white">{admin.name || admin.email}</div>
                        <div className="text-xs text-gray-400">
                          {admin.role.replace('_', ' ')} · {admin.email}
                        </div>
                      </div>
                      {admin.role !== 'head_admin' && (
                        <button
                          onClick={() => handleRemoveAdmin(admin.email)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded"
                          title="Remove from department"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mt-3 p-2 bg-red-900/30 border border-red-700 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-2 bg-green-900/30 border border-green-700 rounded-lg text-xs text-green-400">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
