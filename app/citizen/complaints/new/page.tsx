'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Loader2, Send, CheckCircle2, ArrowLeft, Locate, MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import {
  submitCitizenComplaint, getCitizenMe,
  type CitizenComplaintPayload,
} from '@/lib/citizen-api-client';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';
import { useFormAutosave } from '@/lib/hooks/useFormAutosave';

interface Profile {
  name: string;
  phone: string;
  email: string;
  state?: string;
  district?: string;
}

export default function NewCitizenComplaintPage() {
  const router = useRouter();

  // ── Profile auto-fill ──────────────────────────────────────────────────
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getCitizenMe().then(res => {
      if (res.success && res.data) {
        const c = res.data.citizen as unknown as Profile;
        setProfile(c);
        setForm(prev => ({
          ...prev,
          state: c.state || '',
          district: c.district || '',
        }));
      }
    });
  }, []);

  // ── Form state (autosaved to localStorage) ─────────────────────────────
  const [form, setForm, clearDraft] = useFormAutosave('citizen-complaint-draft', {
    title: '',
    description: '',
    location: '',
    state: '',
    district: '',
    callConsent: true,
  });
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ complaintId?: string; error?: string } | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, callConsent: e.target.checked }));
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setIsGeolocating(true);
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'SamadhanAI/1.0' } }
          );
          if (res.ok) {
            const d = await res.json();
            const a = d.address ?? {};
            const parts = [
              a.suburb,
              a.city || a.town || a.village,
              a.state_district,
              a.state,
            ].filter(Boolean) as string[];
            const locStr = parts.length > 0
              ? parts.join(', ')
              : (d.display_name?.split(',').slice(0, 3).join(', ').trim() ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            setForm(prev => ({
              ...prev,
              location: locStr,
              state: (a.state as string) || prev.state,
              district: (a.state_district as string) || (a.city as string) || (a.town as string) || (a.village as string) || prev.district,
            }));
          } else {
            setForm(prev => ({ ...prev, location: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
          }
          setCoordinates({ lat, lng });
        } catch {
          setForm(prev => ({ ...prev, location: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
          setCoordinates({ lat, lng });
        }
        setIsGeolocating(false);
      },
      (err) => {
        setIsGeolocating(false);
        if (err.code === 1) setGeoError('Location access denied. Enter location manually.');
        else if (err.code === 2) setGeoError('Location unavailable. Enter location manually.');
        else setGeoError('Location request timed out.');
      },
      { timeout: 10000 }
    );
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim() || form.title.trim().length < 5)
      newErrors.title = 'Title must be at least 5 characters';
    if (!form.description.trim() || form.description.trim().length < 20)
      newErrors.description = 'Description must be at least 20 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const payload: CitizenComplaintPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        submitterName: profile?.name,
        submitterPhone: profile?.phone,
        submitterEmail: profile?.email,
        location: form.location.trim() || undefined,
        state: form.state.trim() || undefined,
        district: form.district.trim() || undefined,
        coordinates: coordinates ?? undefined,
        callConsent: form.callConsent,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const res = await submitCitizenComplaint(payload);
      if (res.success && res.data) {
        clearDraft(); // Clear autosaved draft on successful submission
        setResult({ complaintId: res.data.complaintId });
      } else {
        setResult({ error: res.error || 'Submission failed. Please try again.' });
      }
    } catch {
      setResult({ error: 'Network error. Please check your connection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = (err?: string) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-gov-neutral-50 focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 transition-colors ${
      err ? 'border-red-400 bg-red-50' : 'border-gov-blue-200'
    }`;

  // ── Success screen ──────────────────────────────────────────────────────
  if (result?.complaintId) {
    return (
      <div className="citizen-page-shell max-w-lg">
        <div className="citizen-card p-8 text-center shadow-xl">
          <div className="h-1 w-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-500 -mt-8 -mx-8 mb-6 rounded-t-2xl" style={{ width: 'calc(100% + 4rem)' }} />
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 border border-green-200 rounded-2xl mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Grievance Registered</h2>
          <p className="text-sm text-slate-500 mb-6">
            Your complaint has been received and is being routed to the concerned department.
          </p>

          <div className="bg-gov-aqua-50 border border-gov-aqua-200 rounded-xl px-6 py-4 mb-6 inline-block">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gov-blue-700 mb-1">Reference Number</p>
            <p className="text-2xl font-mono font-bold text-gov-blue-900 tracking-wider">{result.complaintId}</p>
          </div>

          <p className="text-xs text-slate-400 mb-6">Save this number to track your complaint at any time.</p>

          {/* AI Chat prompt */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-6 text-left">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">Need immediate guidance?</p>
                <p className="text-xs text-slate-500 mb-3">
                  Chat with our AI assistant for possible solutions, relevant helpline numbers, and next steps while your complaint is being processed.
                </p>
                <Link
                  href={`/citizen/chats/${encodeURIComponent(result.complaintId!)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gov-blue-800 hover:bg-gov-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
                  <MessageSquare size={15} />
                  Chat with AI Assistant
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/citizen/complaints"
              className="citizen-btn-primary"
            >
              Go to My Grievances
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setForm({ title: '', description: '', location: '', state: profile?.state || '', district: profile?.district || '', callConsent: true });
                setCoordinates(null);
              }}
              className="citizen-btn-secondary"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────
  return (
    <div className="citizen-page-shell max-w-3xl">
      {/* Back */}
      <Link
        href="/citizen/complaints"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-gov-blue-800 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to Grievances
      </Link>

      <div className="citizen-card overflow-hidden shadow-xl">
        <div className="h-1 w-full bg-gradient-to-r from-gov-blue-800 via-gov-aqua-700 to-gov-blue-700" />

        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-xl font-bold text-slate-900">New Grievance</h1>
            {(form.title || form.description) && (
              <span className="text-[11px] text-slate-400 italic">Draft auto-saved</span>
            )}
          </div>
          <p className="text-sm text-slate-500 mb-6">
            Describe the issue in detail. Our AI will analyze and route it to the right department.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-slate-800 mb-1">
                Complaint Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title" name="title" type="text"
                value={form.title} onChange={handleChange}
                placeholder="Brief title for your complaint"
                className={inputCls(errors.title)}
              />
              {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-semibold text-slate-800 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description" name="description" rows={5}
                value={form.description} onChange={handleChange}
                placeholder="Describe the issue in detail — what happened, when, and who was involved…"
                className={inputCls(errors.description)}
              />
              <div className="flex items-center justify-between mt-1">
                {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
                <span className="text-[10px] text-slate-400 ml-auto">{form.description.length} chars</span>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-1">
                Attachments <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <FileUpload
                maxFiles={5}
                onFilesChange={setAttachments}
                existingFiles={attachments}
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-slate-800 mb-1">
                Location
              </label>
              <div className="flex gap-2">
                <input
                  id="location" name="location" type="text"
                  value={form.location} onChange={handleChange}
                  placeholder="Area, district, or office name"
                  className={`${inputCls()} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={isGeolocating}
                  className="shrink-0 px-3 py-2.5 bg-gov-aqua-50 border border-gov-aqua-200 text-gov-blue-800 rounded-lg hover:bg-gov-aqua-100 disabled:opacity-60 transition-colors"
                  title="Use my location"
                >
                  {isGeolocating ? <Loader2 size={16} className="animate-spin" /> : <Locate size={16} />}
                </button>
              </div>
              {geoError && <p className="mt-1 text-xs text-red-600">{geoError}</p>}
              {coordinates && (
                <p className="mt-1 text-[10px] text-green-600 flex items-center gap-1">
                  <MapPin size={10} /> GPS coordinates captured
                </p>
              )}
            </div>

            {/* State / District */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-slate-800 mb-1">State</label>
                <input
                  id="state" name="state" type="text"
                  value={form.state} onChange={handleChange}
                  placeholder="e.g. Arunachal Pradesh"
                  className={inputCls()}
                />
              </div>
              <div>
                <label htmlFor="district" className="block text-sm font-semibold text-slate-800 mb-1">District</label>
                <input
                  id="district" name="district" type="text"
                  value={form.district} onChange={handleChange}
                  placeholder="e.g. Papum Pare"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Call consent */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.callConsent}
                onChange={handleCheckbox}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-gov-blue-800 focus:ring-gov-aqua-700"
              />
              <span className="text-sm text-slate-600">
                I consent to receiving a follow-up call from the AI assistant regarding this complaint.
              </span>
            </label>

            {/* Server error */}
            {result?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {result.error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="citizen-btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Complaint
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
