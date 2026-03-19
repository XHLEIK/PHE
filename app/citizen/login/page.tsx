'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { loginCitizen, resendCitizenOtp, verifyCitizenOtp } from '@/lib/citizen-api-client';

type PageView = 'login' | 'verify';

export default function CitizenLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/citizen/complaints';

  const [view, setView] = useState<PageView>('login');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend timer countdown
  useEffect(() => {
    if (view !== 'verify' || canResend) return;
    const interval = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { setCanResend(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [view, canResend]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const passwordValid = form.password.length >= 8;
  const formValid = emailValid && passwordValid;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setServerError('');
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'email' && value && !emailValid) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
    }
    if (name === 'password' && value && !passwordValid) {
      setErrors(prev => ({ ...prev, password: 'Password must be at least 8 characters' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    setIsSubmitting(true);
    setServerError('');

    try {
      const result = await loginCitizen(form.email, form.password);
      if (result.success) {
        router.push(redirect);
      } else {
        // If 403 "verify email" — switch to OTP verification view
        const errMsg = result.error || '';
        if (errMsg.toLowerCase().includes('verify your email') || errMsg.toLowerCase().includes('verify')) {
          setUnverifiedEmail(form.email);
          setView('verify');
          // Auto-send OTP
          handleSendOtp(form.email);
        } else {
          setServerError(errMsg || 'Login failed. Please check your credentials.');
        }
      }
    } catch {
      setServerError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── OTP Handlers ─────────────────────────────────────────────────────────
  const handleSendOtp = async (email: string) => {
    setCanResend(false);
    setResendTimer(60);
    setOtpSent(false);
    try {
      await resendCitizenOtp(email);
      setOtpSent(true);
    } catch { /* ignore */ }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) { setOtp(pasted.split('')); otpRefs.current[5]?.focus(); }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) { setOtpError('Please enter the 6-digit code'); return; }
    setIsVerifying(true);
    setOtpError('');
    try {
      const result = await verifyCitizenOtp(unverifiedEmail, code);
      if (result.success) {
        router.push(redirect);
      } else {
        setOtpError(result.error || 'Invalid OTP. Please try again.');
      }
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const AuthBackground = () => (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 20%, rgba(0, 172, 193, 0.18), transparent 35%), radial-gradient(circle at 85% 10%, rgba(15, 76, 129, 0.16), transparent 28%), radial-gradient(circle at 50% 90%, rgba(0, 142, 163, 0.12), transparent 30%)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#0f4c81 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
    </>
  );

  // ── OTP Verification View ─────────────────────────────────────────────────
  if (view === 'verify') {
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
                Confirm your identity to continue with secure access to water grievance tracking and updates.
              </p>
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3 text-sm text-blue-100">
                  <Waves className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                  <span>Secure, authenticated access for citizen complaint management.</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-blue-100">
                  <Building2 className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                  <span>Direct departmental workflow integration and status transparency.</span>
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
                onClick={() => { setView('login'); setOtp(['', '', '', '', '', '']); setOtpError(''); }}
                className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-gov-blue-800"
              >
                <ArrowLeft size={14} /> Back to login
              </button>

              <h2 className="text-2xl font-bold tracking-tight text-gov-blue-900">Verify Your Email</h2>
              <p className="mt-1 text-sm text-slate-600">
                We sent a 6-digit code to <strong className="text-slate-800">{unverifiedEmail}</strong>
              </p>

              {otpSent && (
                <div className="mt-5 inline-flex w-full items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4" aria-hidden="true" />
                  Verification code sent. Please check inbox and spam folder.
                </div>
              )}

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
                    className="h-14 w-12 rounded-lg border border-gov-blue-200 bg-gov-neutral-50 text-center text-xl font-bold text-gov-blue-900 transition focus:outline-none focus:ring-2 focus:ring-gov-aqua-700"
                  />
                ))}
              </div>

              {otpError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{otpError}</div>
              )}

              <button
                onClick={handleVerify}
                disabled={otp.join('').length !== 6 || isVerifying}
                className="landing-btn-primary mt-6 w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Verifying...
                  </>
                ) : 'Verify & Sign In'}
              </button>

              <div className="mt-4 text-center">
                {canResend ? (
                  <button onClick={() => handleSendOtp(unverifiedEmail)} className="text-sm font-semibold text-gov-blue-800 transition-colors hover:text-gov-blue-700">
                    Resend Code
                  </button>
                ) : (
                  <p className="text-sm text-slate-500">Resend in {resendTimer}s</p>
                )}
              </div>

              <p className="mt-8 border-t border-slate-100 pt-4 text-xs text-slate-500">
                Arunachal Pradesh PHE &amp; Water Supply Department Citizen Services
              </p>
            </section>
          </div>
        </div>
      </main>
    );
  }

  // ── Login View ───────────────────────────────────────────────────────────
  return (
    <main className="auth-page-enter relative min-h-screen overflow-hidden bg-gradient-to-b from-gov-aqua-50 via-white to-gov-neutral-50 font-sans">
      <AuthBackground />

      <div className="landing-container relative py-8 md:py-14">
        <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-gov-blue-100 bg-white/95 shadow-2xl md:grid-cols-[1.1fr_1fr]">
          <aside className="hidden bg-gradient-to-br from-gov-blue-900 via-gov-blue-800 to-gov-blue-700 p-8 text-white md:block">
            <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gov-aqua-100">Citizen Portal</p>
            <h1 className="text-2xl font-bold leading-tight">Arunachal Pradesh PHE Water Grievance Services</h1>
            <p className="mt-3 text-sm leading-7 text-blue-100">
              Sign in to submit, monitor, and manage water supply grievances with transparent departmental updates.
            </p>

            <div className="mt-8 space-y-4 text-sm text-blue-100">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                <span>Secure citizen authentication with verified communication channels.</span>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                <span>Integrated complaint workflow aligned with departmental resolution systems.</span>
              </div>
              <div className="flex items-start gap-3">
                <Waves className="mt-0.5 h-4 w-4 text-gov-aqua-200" aria-hidden="true" />
                <span>Focused on water infrastructure reliability and citizen service transparency.</span>
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

            <h2 className="text-2xl font-bold tracking-tight text-gov-blue-900">Citizen Login</h2>
            <p className="mt-1 text-sm text-slate-600">Sign in to access your grievance dashboard.</p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="you@example.com"
                    className={`w-full rounded-lg border bg-gov-neutral-50 py-2.5 pl-9 pr-3.5 text-sm text-slate-800 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 ${
                      errors.email ? 'border-red-400 bg-red-50' : 'border-gov-blue-200'
                    }`}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="••••••••"
                    className={`w-full rounded-lg border bg-gov-neutral-50 py-2.5 pl-9 pr-10 text-sm text-slate-800 placeholder-slate-400 transition focus:outline-none focus:ring-2 focus:ring-gov-aqua-700 ${
                      errors.password ? 'border-red-400 bg-red-50' : 'border-gov-blue-200'
                    }`}
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

              {serverError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <button
                type="submit"
                disabled={!formValid || isSubmitting}
                className="landing-btn-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link href="/citizen/register" className="font-semibold text-gov-blue-800 transition-colors hover:text-gov-blue-700">
                  Register
                </Link>
              </p>
              <Link
                href="/citizen/track"
                className="inline-flex items-center text-xs font-medium text-slate-500 transition-colors hover:text-gov-blue-700"
              >
                Track a complaint without signing in
              </Link>
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
