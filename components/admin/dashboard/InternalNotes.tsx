'use client';

import { useState, useEffect } from 'react';
import { getComplaintNotes, addComplaintNote } from '@/lib/api-client';

interface Note {
  _id: string;
  authorName: string;
  authorEmail: string;
  content: string;
  type: 'manual' | 'system';
  createdAt: string;
}

interface InternalNotesProps {
  complaintId: string;
}

export default function InternalNotes({ complaintId }: InternalNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [complaintId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await getComplaintNotes(complaintId);
      if (res.success && res.data) {
        setNotes(res.data as unknown as Note[]);
      }
    } catch {
      setError('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      const res = await addComplaintNote(complaintId, newNote.trim());
      if (res.success && res.data) {
        setNotes((prev) => [res.data as unknown as Note, ...prev]);
        setNewNote('');
      } else {
        setError(res.error || 'Failed to add note');
      }
    } catch {
      setError('Failed to add note');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>💬</span> Internal Notes
          <span className="text-xs text-gray-400 font-normal">({notes.length})</span>
        </h3>
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-gray-700">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal note... (not visible to citizens)"
          className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          maxLength={2000}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-500">{newNote.length}/2000</span>
          <button
            type="submit"
            disabled={submitting || !newNote.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            {submitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </form>

      {/* Notes list */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-400 text-sm">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">No internal notes yet</div>
        ) : (
          notes.map((note) => (
            <div
              key={note._id}
              className={`p-4 border-b border-gray-700/50 ${
                note.type === 'system' ? 'bg-gray-800/50' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-blue-400">
                  {note.type === 'system' ? '🤖 System' : note.authorName}
                </span>
                <span className="text-[10px] text-gray-500">{formatDate(note.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
