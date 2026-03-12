'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { registerCitizen, verifyCitizenOtp, resendCitizenOtp } from '@/lib/citizen-api-client';

type Step = 'register' | 'verify';

export default function CitizenRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');

  // ── Registration form state ─────────────────────────────────────────────
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    state: '',
    district: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // ── OTP verification state ──────────────────────────────────────────────
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend timer countdown
  useEffect(() => {
    if (step !== 'verify' || canResend) return;
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, canResend]);

  // ── Handlers: Registration ──────────────────────────────────────────────
  const PHONE_RE = /^(\+91)?[6-9]\d{9}$/;
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Full name is required';
        if (value.trim().length < 3) return 'Name must be at least 3 characters';
        return undefined;
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!PHONE_RE.test(value.trim())) return 'Enter a valid Indian mobile number';
        return undefined;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!EMAIL_RE.test(value.trim())) return 'Enter a valid email address';
        return undefined;
      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setServerError('');
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const err = validate(name, value);
    if (err) setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate all
    const required = ['name', 'phone', 'email', 'password'] as const;
    const newErrors: Record<string, string> = {};
    let valid = true;
    for (const f of required) {
      const err = validate(f, form[f]);
      if (err) { newErrors[f] = err; valid = false; }
    }
    setErrors(newErrors);
    if (!valid) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const result = await registerCitizen({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password,
        state: form.state.trim() || undefined,
        district: form.district.trim() || undefined,
      });

      if (result.success) {
        // Capture devOtp if returned (development mode)
        if (result.data && typeof result.data === 'object' && 'devOtp' in result.data) {
          setDevOtp((result.data as Record<string, string>).devOtp);
        }
        setStep('verify');
        setResendTimer(60);
        setCanResend(false);
      } else {
        setServerError(result.error || 'Registration failed. Please try again.');
      }
    } catch {
      setServerError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handlers: OTP ────────────────────────────────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');

    // Auto-focus next
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the 6-digit code');
      return;
    }

    setIsVerifying(true);
    setOtpError('');

    try {
      const result = await verifyCitizenOtp(form.email, code);
      if (result.success) {
        router.push('/citizen/complaints');
      } else {
        setOtpError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setCanResend(false);
    setResendTimer(60);
    try {
      await resendCitizenOtp(form.email);
    } catch { /* ignore */ }
  };

  const inputCls = (err?: string) =>
    `w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
      err ? 'border-red-400 bg-red-50' : 'border-slate-200'
    }`;

  // ── OTP Verification UI ─────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <main className="min-h-screen bg-[#faf7f0] flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />

            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
                <CheckCircle2 size={28} className="text-amber-700" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Verify Your Email</h2>
              <p className="text-sm text-slate-500 mt-2">
                We sent a 6-digit code to <strong className="text-slate-700">{form.email}</strong>
              </p>

              {/* Dev mode: show OTP directly */}
              {devOtp && process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
                <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
                  🔑 Dev OTP: <strong className="font-mono tracking-widest">{devOtp}</strong>
                </div>
              )}

              {/* OTP input boxes */}
              <div className="flex justify-center gap-2.5 mt-8" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                      otpError ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                ))}
              </div>

              {otpError && (
                <p className="mt-3 text-sm text-red-600">{otpError}</p>
              )}

              <button
                onClick={handleVerify}
                disabled={isVerifying || otp.join('').length !== 6}
                className="mt-6 w-full py-3 rounded-xl font-bold text-white text-sm bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Verifying…
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <div className="mt-4 text-sm text-slate-500">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    className="font-semibold text-amber-700 hover:text-amber-800"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>Resend code in <strong>{resendTimer}s</strong></span>
                )}
              </div>

              <button
                onClick={() => setStep('register')}
                className="mt-4 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <ArrowLeft size={12} /> Back to registration
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Registration UI ─────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#faf7f0] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#b45309 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-700 rounded-2xl shadow-lg shadow-amber-700/20 mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">Register to submit and track grievances</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />

          <form onSubmit={handleRegister} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-800 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name" name="name" type="text" autoComplete="name"
                value={form.name} onChange={handleChange} onBlur={handleBlur}
                placeholder="As per official records"
                className={inputCls(errors.name)}
              />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-800 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="phone" name="phone" type="tel" autoComplete="tel"
                  value={form.phone} onChange={handleChange} onBlur={handleBlur}
                  placeholder="9876543210"
                  className={inputCls(errors.phone)}
                />
                {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  value={form.email} onChange={handleChange} onBlur={handleBlur}
                  placeholder="you@example.com"
                  className={inputCls(errors.email)}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Minimum 8 characters"
                  className={`${inputCls(errors.password)} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-semibold text-slate-800 mb-1">
                  State <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  id="state" name="state" type="text"
                  value={form.state} onChange={handleChange}
                  placeholder="e.g. Arunachal Pradesh"
                  className={inputCls()}
                />
              </div>

              {/* District */}
              <div>
                <label htmlFor="district" className="block text-sm font-semibold text-slate-800 mb-1">
                  District <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  id="district" name="district" type="text"
                  value={form.district} onChange={handleChange}
                  placeholder="e.g. Papum Pare"
                  className={inputCls()}
                />
              </div>
            </div>

            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl font-bold text-white text-sm bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-700/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="px-6 pb-6 text-center border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/citizen/login" className="font-semibold text-amber-700 hover:text-amber-800">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Samadhan AI — National Grievance Redressal Platform
        </p>
      </div>
    </main>
  );
}
