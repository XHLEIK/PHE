'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
  const [devOtp, setDevOtp] = useState('');
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
      const result = await resendCitizenOtp(email);
      setOtpSent(true);
      if (result.data && typeof result.data === 'object' && 'devOtp' in result.data) {
        setDevOtp((result.data as Record<string, string>).devOtp);
      }
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

  // ── OTP Verification View ─────────────────────────────────────────────────
  if (view === 'verify') {
    return (
      <main className="min-h-screen bg-[#faf7f0] flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#b45309 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="w-full max-w-md z-10">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-700 rounded-2xl shadow-lg shadow-amber-700/20 mb-4">
              <Shield size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verify Your Email</h1>
            <p className="text-sm text-slate-500 mt-1">
              We sent a 6-digit code to <strong className="text-slate-700">{unverifiedEmail}</strong>
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />
            <div className="p-6 space-y-6">
              {/* Back link */}
              <button onClick={() => { setView('login'); setOtp(['', '', '', '', '', '']); setOtpError(''); }} className="flex items-center gap-1 text-sm text-slate-500 hover:text-amber-700 transition-colors">
                <ArrowLeft size={14} /> Back to login
              </button>

              {otpSent && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  Verification code sent! Check your email inbox (and spam folder).
                </div>
              )}

              {/* Dev mode: show OTP directly */}
              {devOtp && process.env.NEXT_PUBLIC_DEV_MODE === 'true' && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-2 text-sm text-blue-700">
                  🔑 Dev OTP: <strong className="font-mono tracking-widest">{devOtp}</strong>
                </div>
              )}

              {/* OTP inputs */}
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
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
                    className="w-12 h-14 text-center text-xl font-bold border border-slate-200 rounded-lg bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                  />
                ))}
              </div>

              {otpError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{otpError}</div>
              )}

              <button
                onClick={handleVerify}
                disabled={otp.join('').length !== 6 || isVerifying}
                className="w-full py-3 rounded-xl font-bold text-white text-sm bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-700/10 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Verifying…
                  </>
                ) : 'Verify & Sign In'}
              </button>

              {/* Resend */}
              <div className="text-center">
                {canResend ? (
                  <button onClick={() => handleSendOtp(unverifiedEmail)} className="text-sm font-semibold text-amber-700 hover:text-amber-800">
                    Resend Code
                  </button>
                ) : (
                  <p className="text-sm text-slate-400">Resend in {resendTimer}s</p>
                )}
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            Samadhan AI — National Grievance Redressal Platform
          </p>
        </div>
      </main>
    );
  }

  // ── Login View ───────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#faf7f0] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#b45309 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />

      <div className="w-full max-w-md z-10">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-700 rounded-2xl shadow-lg shadow-amber-700/20 mb-4">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your citizen portal</p>
        </div>

        {/* Login card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-amber-700 via-yellow-400 to-amber-700" />

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@example.com"
                className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                  errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-800 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm text-slate-800 placeholder-slate-400 bg-[#faf7f0] focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors ${
                    errors.password ? 'border-red-400 bg-red-50' : 'border-slate-200'
                  }`}
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

            {/* Server error */}
            {serverError && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!formValid || isSubmitting}
              className="w-full py-3 rounded-xl font-bold text-white text-sm bg-amber-700 hover:bg-amber-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-md shadow-amber-700/10 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="px-6 pb-6 text-center space-y-3">
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <Link href="/citizen/register" className="font-semibold text-amber-700 hover:text-amber-800">
                  Register
                </Link>
              </p>
            </div>
            <Link
              href="/citizen/track"
              className="inline-block text-xs text-slate-400 hover:text-amber-700 transition-colors"
            >
              Track a complaint without signing in →
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Samadhan AI — National Grievance Redressal Platform
        </p>
      </div>
    </main>
  );
}
