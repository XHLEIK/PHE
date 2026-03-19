'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Waves,
} from 'lucide-react';
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
    `w-full rounded-lg border bg-gov-neutral-50 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 ${
      err ? 'border-red-400 bg-red-50' : 'border-gov-blue-200'
    }`;

  const AuthBackground = () => (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 15%, rgba(0, 172, 193, 0.18), transparent 34%), radial-gradient(circle at 84% 10%, rgba(15, 76, 129, 0.16), transparent 28%), radial-gradient(circle at 50% 88%, rgba(0, 142, 163, 0.12), transparent 30%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#0f4c81 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    </>
  );

  // ── OTP Verification UI ─────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <main className="auth-page-enter relative min-h-screen overflow-hidden bg-gradient-to-b from-gov-aqua-50 via-white to-gov-neutral-50 font-sans">
        <AuthBackground />
        <div className="landing-container relative py-8 md:py-14">
          <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-gov-blue-100 bg-white/95 shadow-2xl md:grid-cols-[1.05fr_1fr]">
            <aside className="hidden bg-gradient-to-br from-gov-blue-900 via-gov-blue-800 to-gov-blue-700 p-8 text-white md:block">
              <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                <ShieldCheck className="h-6 w-6" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-bold leading-tight">Citizen Verification Portal</h1>
              <p className="mt-3 text-sm leading-7 text-blue-100">
                Confirm your email to activate your citizen account and continue to the grievance dashboard.
              </p>
              <div className="mt-8 space-y-4 text-sm text-blue-100">
                <div className="flex items-start gap-3">
                  <Waves className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                  <span>Verified users receive secure status updates and department responses.</span>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                  <span>Supports transparent and accountable water grievance handling.</span>
                </div>
              </div>
            </aside>

            <section className="p-6 md:p-8">
              <Link
                href="/"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gov-blue-800 transition-colors hover:text-gov-blue-700"
              >
                <Home size={14} /> Back to Home
              </Link>

              <button
                onClick={() => setStep('register')}
                className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-gov-blue-800"
              >
                <ArrowLeft size={14} /> Back to registration
              </button>

              <h2 className="text-2xl font-bold tracking-tight text-gov-blue-900">Verify Your Email</h2>
              <p className="mt-1 text-sm text-slate-600">
                We sent a 6-digit code to <strong className="text-slate-800">{form.email}</strong>
              </p>

              <div className="mt-6 flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                    aria-label={`OTP digit ${i + 1}`}
                    className={`h-14 w-12 rounded-lg border text-center text-xl font-bold text-gov-blue-900 transition focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 ${
                      otpError ? 'border-red-300 bg-red-50' : 'border-gov-blue-200 bg-gov-neutral-50'
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
                className="landing-btn-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <div className="mt-4 text-sm text-slate-500">
                {canResend ? (
                  <button
                    onClick={handleResend}
                    className="font-semibold text-gov-blue-800 transition-colors hover:text-gov-blue-700"
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>Resend code in <strong>{resendTimer}s</strong></span>
                )}
              </div>

              <p className="mt-7 border-t border-slate-100 pt-4 text-xs text-slate-500">
                Arunachal Pradesh PHE &amp; Water Supply Department Citizen Services
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  // ── Registration UI ─────────────────────────────────────────────────────
  return (
    <main className="auth-page-enter relative min-h-screen overflow-hidden bg-gradient-to-b from-gov-aqua-50 via-white to-gov-neutral-50 font-sans">
      <AuthBackground />

      <div className="landing-container relative py-8 md:py-14">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-gov-blue-100 bg-white/95 shadow-2xl md:grid-cols-[1.1fr_1fr]">
          <aside className="hidden bg-gradient-to-br from-gov-blue-900 via-gov-blue-800 to-gov-blue-700 p-8 text-white md:block">
            <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gov-aqua-100">Citizen Registration</p>
            <h1 className="text-2xl font-bold leading-tight">Create Your Water Grievance Citizen Account</h1>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              Register to report water supply issues, receive updates, and track complaint resolution progress.
            </p>

            <div className="mt-8 space-y-4 text-sm text-blue-100">
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                <span>One account for complaint submission, tracking, and communication.</span>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                <span>Connected to departmental workflows for faster response handling.</span>
              </div>
              <div className="flex items-start gap-3">
                <Waves className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                <span>Designed for transparent governance of water infrastructure grievances.</span>
              </div>
            </div>
          </aside>

          <section className="p-6 md:p-8">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gov-blue-800 transition-colors hover:text-gov-blue-700"
            >
              <Home size={14} /> Back to Home
            </Link>

            <h2 className="text-2xl font-bold tracking-tight text-gov-blue-900">Create Account</h2>
            <p className="mt-1 text-sm text-slate-600">Register to submit and track grievances.</p>

            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-semibold text-slate-800">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="name" name="name" type="text" autoComplete="name"
                    value={form.name} onChange={handleChange} onBlur={handleBlur}
                    placeholder="As per official records"
                    className={`${inputCls(errors.name)} pl-9`}
                  />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="mb-1 block text-sm font-semibold text-slate-800">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="phone" name="phone" type="tel" autoComplete="tel"
                      value={form.phone} onChange={handleChange} onBlur={handleBlur}
                      placeholder="9876543210"
                      className={`${inputCls(errors.phone)} pl-9`}
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-semibold text-slate-800">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input
                      id="email" name="email" type="email" autoComplete="email"
                      value={form.email} onChange={handleChange} onBlur={handleBlur}
                      placeholder="you@example.com"
                      className={`${inputCls(errors.email)} pl-9`}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-semibold text-slate-800">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="password" name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password} onChange={handleChange} onBlur={handleBlur}
                    placeholder="Minimum 8 characters"
                    className={`${inputCls(errors.password)} pl-9 pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="state" className="mb-1 block text-sm font-semibold text-slate-800">
                    State <span className="text-xs font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="state" name="state" type="text"
                    value={form.state} onChange={handleChange}
                    placeholder="e.g. Arunachal Pradesh"
                    className={inputCls()}
                  />
                </div>

                <div>
                  <label htmlFor="district" className="mb-1 block text-sm font-semibold text-slate-800">
                    District <span className="text-xs font-normal text-slate-400">(optional)</span>
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
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="landing-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-600">
                Already have an account?{' '}
                <Link href="/citizen/login" className="font-semibold text-gov-blue-800 transition-colors hover:text-gov-blue-700">
                  Sign In
                </Link>
              </p>
            </div>

            <p className="mt-7 text-xs text-slate-500">
              Arunachal Pradesh PHE &amp; Water Supply Department Citizen Services
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
