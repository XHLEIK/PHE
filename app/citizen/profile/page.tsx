'use client';

import React, { useState, useEffect } from 'react';
import { User, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { getCitizenMe, updateCitizenProfile, type CitizenProfileUpdate } from '@/lib/citizen-api-client';

interface Profile {
  name: string;
  phone: string;
  email: string;
  state?: string;
  district?: string;
  isVerified?: boolean;
  createdAt?: string;
}

export default function CitizenProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', state: '', district: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await getCitizenMe();
        if (res.success && res.data) {
          const c = res.data.citizen as unknown as Profile;
          setProfile(c);
          setForm({ name: c.name || '', state: c.state || '', district: c.district || '' });
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setSuccess(false);
    setError('');

    try {
      const payload: CitizenProfileUpdate = {};
      if (form.name.trim() !== profile?.name) payload.name = form.name.trim();
      if (form.state.trim() !== (profile?.state || '')) payload.state = form.state.trim();
      if (form.district.trim() !== (profile?.district || '')) payload.district = form.district.trim();

      if (Object.keys(payload).length === 0) {
        setSuccess(true);
        setIsSaving(false);
        return;
      }

      const res = await updateCitizenProfile(payload);
      if (res.success) {
        setSuccess(true);
        if (res.data?.citizen) {
          const updated = res.data.citizen as unknown as Profile;
          setProfile(updated);
        }
      } else {
        setError(res.error || 'Update failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors';

  const readOnlyCls =
    'w-full rounded-lg border border-slate-100 px-3.5 py-2.5 text-sm text-slate-500 bg-slate-50 cursor-not-allowed';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} /> Loading profile…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <p className="text-sm text-slate-500">Unable to load profile. Please try refreshing.</p>
      </div>
    );
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="max-w-xl mx-auto">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-6">
        <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />
        <div className="p-6 flex items-center gap-4">
          <div className="shrink-0 w-16 h-16 bg-amber-100 border-2 border-amber-300 rounded-2xl flex items-center justify-center">
            <User size={28} className="text-amber-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
            <p className="text-sm text-slate-500">{profile.email}</p>
            {profile.createdAt && (
              <p className="text-xs text-slate-400 mt-0.5">Member since {fmtDate(profile.createdAt)}</p>
            )}
          </div>
          {profile.isVerified && (
            <span className="ml-auto inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-semibold border border-green-200">
              <CheckCircle2 size={10} /> Verified
            </span>
          )}
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Edit Profile</h2>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-800 mb-1">
                Full Name
              </label>
              <input
                id="name" name="name" type="text"
                value={form.name} onChange={handleChange}
                className={inputCls}
              />
            </div>

            {/* Read-only fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Email <span className="text-slate-400 font-normal text-xs">(read-only)</span>
                </label>
                <input type="text" value={profile.email} readOnly className={readOnlyCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Phone <span className="text-slate-400 font-normal text-xs">(read-only)</span>
                </label>
                <input type="text" value={profile.phone} readOnly className={readOnlyCls} />
              </div>
            </div>

            {/* State / District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-slate-800 mb-1">State</label>
                <input
                  id="state" name="state" type="text"
                  value={form.state} onChange={handleChange}
                  placeholder="e.g. Arunachal Pradesh"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="district" className="block text-sm font-semibold text-slate-800 mb-1">District</label>
                <input
                  id="district" name="district" type="text"
                  value={form.district} onChange={handleChange}
                  placeholder="e.g. Papum Pare"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Success / Error */}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                <CheckCircle2 size={14} /> Profile updated successfully.
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 rounded-xl font-bold text-white text-sm bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-700/10 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Save size={16} /> Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
