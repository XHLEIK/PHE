'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitComplaint } from '@/lib/api-client';
import FileUpload, { type UploadedFile } from '@/components/FileUpload';

interface Coordinates {
  lat: number;
  lng: number;
}

interface FormState {
  submitterName: string;
  submitterPhone: string;
  submitterEmail: string;
  title: string;
  description: string;
  location: string;
  state: string;
  district: string;
  coordinates: Coordinates | null;
  callConsent: boolean;
}

interface FieldErrors {
  submitterName?: string;
  submitterPhone?: string;
  submitterEmail?: string;
  title?: string;
  description?: string;
}

const PHONE_RE = /^(\+91)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ErrorMsg = ({ msg }: { msg: string }) => (
  <p className="mt-1 text-xs text-red-600 flex items-start gap-1">
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
    {msg}
  </p>
);

const inputCls = (err?: string) =>
  `w-full rounded-lg border px-3 py-2.5 text-sm text-[#1e293b] placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${err ? 'border-red-400 bg-red-50' : 'border-slate-200'}`;

const ComplaintForm = () => {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    submitterName: '',
    submitterPhone: '',
    submitterEmail: '',
    title: '',
    description: '',
    location: '',
    state: '',
    district: '',
    coordinates: null,
    callConsent: true,
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    complaintId?: string;
    message?: string;
  } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof FieldErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = (name: keyof FieldErrors, value: string): string | undefined => {
    switch (name) {
      case 'submitterName':
        if (!value.trim()) return 'Full name is required.';
        if (value.trim().length < 3) return 'Name must be at least 3 characters.';
        if (value.trim().length > 100) return 'Name must be under 100 characters.';
        return undefined;
      case 'submitterPhone':
        if (!value.trim()) return 'Mobile number is required.';
        if (!PHONE_RE.test(value.trim()))
          return 'Enter a valid Indian mobile number (e.g. 9876543210 or +919876543210).';
        return undefined;
      case 'submitterEmail':
        if (!value.trim()) return 'Email address is required.';
        if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address.';
        return undefined;
      case 'title':
        if (!value.trim()) return 'Complaint title is required.';
        if (value.trim().length < 5) return 'Title must be at least 5 characters.';
        return undefined;
      case 'description':
        if (!value.trim()) return 'Please describe your grievance.';
        if (value.trim().length < 20) return 'Description must be at least 20 characters.';
        return undefined;
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const err = validate(name as keyof FieldErrors, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser. Please type the location manually.');
      return;
    }
    setIsGeolocating(true);
    setGeoError(null);

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
            const locStr =
              parts.length > 0
                ? parts.join(', ')
                : (d.display_name?.split(',').slice(0, 3).join(', ').trim() ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            const geoState = (a.state as string) || '';
            const geoDistrict = (a.state_district as string) || (a.city as string) || (a.town as string) || (a.village as string) || '';
            setForm(prev => ({ ...prev, location: locStr, state: geoState, district: geoDistrict, coordinates: { lat, lng } }));
          } else {
            setForm(prev => ({ ...prev, location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, coordinates: { lat, lng } }));
          }
        } catch {
          setForm(prev => ({ ...prev, location: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, coordinates: { lat, lng } }));
        }
        setIsGeolocating(false);
      },
      (err) => {
        setIsGeolocating(false);
        if (err.code === 1)
          setGeoError('Location access was denied. Please type the district or office name manually.');
        else if (err.code === 2)
          setGeoError('Location unavailable. Please type the incident location manually.');
        else
          setGeoError('Location request timed out. Please type the incident location manually.');
      },
      { timeout: 10000 }
    );
  };

  const validateAll = (): boolean => {
    const fields: Array<keyof FieldErrors> = [
      'submitterName', 'submitterPhone', 'submitterEmail', 'title', 'description',
    ];
    const newErrors: FieldErrors = {};
    let valid = true;
    for (const f of fields) {
      const err = validate(f, form[f] as string);
      if (err) { newErrors[f] = err; valid = false; }
    }
    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const result = await submitComplaint({
        title: form.title.trim(),
        description: form.description.trim(),
        submitterName: form.submitterName.trim(),
        submitterPhone: form.submitterPhone.trim(),
        submitterEmail: form.submitterEmail.trim(),
        location: form.location.trim() || undefined,
        state: form.state.trim() || undefined,
        district: form.district.trim() || undefined,
        coordinates: form.coordinates ?? undefined,
        callConsent: form.callConsent,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      if (result.success && result.data) {
        setSubmitResult({ success: true, complaintId: result.data.complaintId });
      } else {
        const msg =
          result.errors?.map(e => e.message).join(', ') ||
          result.error ||
          'Submission failed. Please try again.';
        setSubmitResult({ success: false, message: msg });
      }
    } catch {
      setSubmitResult({ success: false, message: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitResult(null);
    setForm({ submitterName: '', submitterPhone: '', submitterEmail: '', title: '', description: '', location: '', state: '', district: '', coordinates: null, callConsent: true });
    setErrors({});
    setAttachments([]);
    setGeoError(null);
  };

  // ── Success acknowledgement ───────────────────────────────────────────────
  if (submitResult?.success && submitResult.complaintId) {
    return (
      <div className="bg-white border border-green-200 rounded-2xl p-8 shadow-lg text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 border border-green-200 mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#1e293b] mb-2">Grievance Registered</h2>
        <p className="text-slate-500 mb-6 text-sm max-w-sm mx-auto">
          Your complaint has been received and is being routed to the concerned department.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-6 py-4 mb-4 inline-block">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 mb-1">Reference Number</p>
          <p className="text-2xl font-mono font-bold text-[#b8860b] tracking-wider">{submitResult.complaintId}</p>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Save this number to track your complaint status at any time.
        </p>

        {/* Chat redirect — auto-redirect after 3 seconds */}
        <div className="space-y-3">
          <button
            onClick={() => {
              router.push(
                `/chat?complaintId=${encodeURIComponent(submitResult.complaintId!)}&email=${encodeURIComponent(form.submitterEmail)}`
              );
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-white text-sm bg-[#b8860b] hover:bg-amber-700 transition-colors shadow-md shadow-amber-100 flex items-center justify-center gap-2 mx-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat with AI Assistant
          </button>

          <button
            onClick={resetForm}
            className="text-sm font-semibold text-[#b8860b] underline underline-offset-2 hover:text-amber-800 transition-colors"
          >
            Submit another complaint
          </button>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="bg-white rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
        {/* Gold top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />

        {/* Form header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-[#1e293b]">Register Your Grievance</h2>
          <p className="text-sm text-slate-500 mt-1">
            Fields marked <span className="text-red-500">*</span> are required. Your contact details are kept confidential.
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* ── Complainant Details ──────────────────────────────── */}
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              Complainant Details
            </legend>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="submitterName" className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="submitterName" name="submitterName" type="text" autoComplete="name"
                  value={form.submitterName} onChange={handleChange} onBlur={handleBlur}
                  placeholder="As per official records"
                  className={inputCls(errors.submitterName)}
                />
                {errors.submitterName && <ErrorMsg msg={errors.submitterName} />}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Phone */}
                <div>
                  <label htmlFor="submitterPhone" className="block text-sm font-semibold text-[#1e293b] mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="submitterPhone" name="submitterPhone" type="tel" autoComplete="tel"
                    value={form.submitterPhone} onChange={handleChange} onBlur={handleBlur}
                    placeholder="9876543210"
                    className={inputCls(errors.submitterPhone)}
                  />
                  {errors.submitterPhone
                    ? <ErrorMsg msg={errors.submitterPhone} />
                    : <p className="mt-1 text-[11px] text-slate-400">Enter a valid phone number so we can reach you about your complaint.</p>
                  }
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="submitterEmail" className="block text-sm font-semibold text-[#1e293b] mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="submitterEmail" name="submitterEmail" type="email" autoComplete="email"
                    value={form.submitterEmail} onChange={handleChange} onBlur={handleBlur}
                    placeholder="you@example.com"
                    className={inputCls(errors.submitterEmail)}
                  />
                  {errors.submitterEmail && <ErrorMsg msg={errors.submitterEmail} />}
                </div>
              </div>

              {/* Call Consent */}
              <div className="mt-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={form.callConsent}
                    onChange={(e) => setForm(prev => ({ ...prev, callConsent: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-700 focus:ring-amber-500 accent-amber-700"
                  />
                  <span className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">
                    I consent to receive an automated call regarding this grievance. The call may be logged for resolution purposes.
                  </span>
                </label>
              </div>
            </div>
          </fieldset>

          <hr className="border-slate-100" />

          {/* ── Grievance Details ────────────────────────────────── */}
          <fieldset>
            <legend className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              Grievance Details
            </legend>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Complaint Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title" name="title" type="text"
                  value={form.title} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Brief summary of your grievance"
                  className={inputCls(errors.title)}
                />
                {errors.title && <ErrorMsg msg={errors.title} />}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Detailed Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description" name="description" rows={5}
                  value={form.description} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Provide dates, names of officials, documents involved, and any other relevant details…"
                  className={`${inputCls(errors.description)} resize-none`}
                />
                {errors.description && <ErrorMsg msg={errors.description} />}
              </div>

              {/* File Attachments */}
              <div>
                <label className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Attachments{' '}
                  <span className="text-slate-400 font-normal text-xs">(optional — images or videos)</span>
                </label>
                <FileUpload
                  maxFiles={5}
                  onFilesChange={setAttachments}
                  existingFiles={attachments}
                />
              </div>

              {/* Incident Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-[#1e293b] mb-1">
                  Incident Location{' '}
                  <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <div className="flex gap-2 items-start">
                  <input
                    id="location" name="location" type="text"
                    value={form.location} onChange={handleChange}
                    placeholder="District, Centre, or Office Name"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-[#1e293b] placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button" onClick={handleUseLocation} disabled={isGeolocating}
                    title="Use my current location"
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-semibold hover:bg-amber-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {isGeolocating ? (
                      <>
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                        Locating…
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                        </svg>
                        Use My Location
                      </>
                    )}
                  </button>
                </div>

                {geoError && (
                  <div className="mt-2 text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-start gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#b8860b" strokeWidth="2" className="mt-0.5 shrink-0">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {geoError}
                  </div>
                )}

                {form.coordinates && !geoError && (
                  <p className="mt-1.5 text-xs text-green-700 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Location captured ({form.coordinates.lat.toFixed(4)}, {form.coordinates.lng.toFixed(4)})
                  </p>
                )}
              </div>
            </div>
          </fieldset>
        </div>

        {/* Submit footer */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100">
          {submitResult?.success === false && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{submitResult.message}</span>
            </div>
          )}

          <button
            type="submit" disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-white text-sm tracking-wide bg-[#b8860b] hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-100 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Submitting…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                Submit Complaint
              </>
            )}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Your information is securely handled and shared only with authorised officials.
          </p>
        </div>
      </div>
    </form>
  );
};

export default ComplaintForm;
