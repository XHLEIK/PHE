'use client';

import { useState, useEffect } from 'react';
import { getAdminUsers, assignComplaint } from '@/lib/api-client';

interface Admin {
  _id: string;
  name: string;
  email: string;
  role: string;
  departments: string[];
}

interface AssignmentPickerProps {
  complaintId: string;
  complaintDepartment: string;
  currentAssignee?: string | null;
  onAssigned: (assigneeName: string) => void;
}

export default function AssignmentPicker({
  complaintId,
  complaintDepartment,
  currentAssignee,
  onAssigned,
}: AssignmentPickerProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) fetchAdmins();
  }, [open]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers();
      if (res.success && res.data) {
        // Filter admins who have access to the department
        const eligible = (res.data as unknown as Admin[]).filter(
          (admin) =>
            admin.role === 'head_admin' ||
            admin.departments?.includes(complaintDepartment)
        );
        setAdmins(eligible);
      }
    } catch {
      setError('Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (adminEmail: string) => {
    setAssigning(true);
    setError('');
    try {
      const res = await assignComplaint(complaintId, { assignToEmail: adminEmail });
      if (res.success) {
        const admin = admins.find((a) => a.email === adminEmail);
        onAssigned(admin?.name || adminEmail);
        setOpen(false);
      } else {
        setError(res.error || 'Failed to assign');
      }
    } catch {
      setError('Failed to assign complaint');
    } finally {
      setAssigning(false);
    }
  };

  const handleSelfAssign = async () => {
    setAssigning(true);
    setError('');
    try {
      const res = await assignComplaint(complaintId, { assignToSelf: true });
      if (res.success) {
        onAssigned('You');
        setOpen(false);
      } else {
        setError(res.error || 'Failed to assign');
      }
    } catch {
      setError('Failed to self-assign');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Assigned to:</span>
        <span className="text-sm text-white font-medium">
          {currentAssignee || 'Unassigned'}
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          {currentAssignee ? 'Reassign' : 'Assign'}
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700">
            <h4 className="text-sm font-medium text-white">Assign Complaint</h4>
          </div>

          <button
            onClick={handleSelfAssign}
            disabled={assigning}
            className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50"
          >
            <span className="text-sm text-blue-400 font-medium">👤 Assign to myself</span>
          </button>

          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-gray-400 text-sm">Loading...</div>
            ) : admins.length === 0 ? (
              <div className="p-3 text-center text-gray-400 text-sm">No eligible admins</div>
            ) : (
              admins.map((admin) => (
                <button
                  key={admin._id}
                  onClick={() => handleAssign(admin.email)}
                  disabled={assigning}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors border-b border-gray-700/50"
                >
                  <div className="text-sm text-white">{admin.name || admin.email}</div>
                  <div className="text-xs text-gray-400">
                    {admin.role.replace('_', ' ')} · {admin.email}
                  </div>
                </button>
              ))
            )}
          </div>

          {error && (
            <div className="p-2 text-xs text-red-400 bg-red-900/20">{error}</div>
          )}
        </div>
      )}
    </div>
  );
}
