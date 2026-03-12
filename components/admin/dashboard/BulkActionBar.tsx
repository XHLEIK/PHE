'use client';

import { useState } from 'react';
import { bulkUpdateComplaints } from '@/lib/api-client';
import { DEPARTMENTS } from '@/lib/constants';

interface BulkActionBarProps {
  selectedIds: string[];
  onClear: () => void;
  onComplete: () => void;
}

const STATUS_OPTIONS = ['pending', 'triage', 'in_progress', 'resolved', 'closed', 'escalated'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];

export default function BulkActionBar({ selectedIds, onClear, onComplete }: BulkActionBarProps) {
  const [action, setAction] = useState<'status' | 'priority' | 'department' | ''>('');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (selectedIds.length === 0) return null;

  const handleApply = async () => {
    if (!action || !value || !reason.trim()) {
      setError('Please select an action, value, and provide a reason');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const updates: Record<string, string> = { [action]: value };
      const res = await bulkUpdateComplaints({
        complaintIds: selectedIds,
        updates,
        reason: reason.trim(),
      });

      if (res.success) {
        onComplete();
        onClear();
        setAction('');
        setValue('');
        setReason('');
      } else {
        setError(res.error || 'Bulk update failed');
      }
    } catch {
      setError('Bulk update failed');
    } finally {
      setLoading(false);
    }
  };

  const getOptions = () => {
    switch (action) {
      case 'status':
        return STATUS_OPTIONS;
      case 'priority':
        return PRIORITY_OPTIONS;
      case 'department':
        return DEPARTMENTS.map((d) => d.id);
      default:
        return [];
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-blue-900/90 backdrop-blur-sm border border-blue-700 rounded-xl p-4 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-blue-200 font-medium">
          {selectedIds.length} selected
        </span>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value as 'status' | 'priority' | 'department' | '');
            setValue('');
          }}
          className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5"
        >
          <option value="">Select action...</option>
          <option value="status">Change Status</option>
          <option value="priority">Change Priority</option>
          <option value="department">Change Department</option>
        </select>

        {action && (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5"
          >
            <option value="">Select value...</option>
            {getOptions().map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for change..."
          className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg px-3 py-1.5 flex-1 min-w-[200px]"
        />

        <button
          onClick={handleApply}
          disabled={loading || !action || !value || !reason.trim()}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          {loading ? 'Applying...' : 'Apply'}
        </button>

        <button
          onClick={onClear}
          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>

      {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
    </div>
  );
}
