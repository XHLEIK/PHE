'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminInput from './AdminInput';
import AdminButton from './AdminButton';
import { loginAdmin } from '@/lib/api-client';

const AdminLoginForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    password: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  useEffect(() => {
    const emailValid = validateEmail(formData.email);
    const passwordValid = formData.password.length >= 8;
    setIsFormValid(emailValid && passwordValid);
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setServerError('');
    
    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'email') {
      if (!value) {
        setErrors((prev) => ({ ...prev, email: 'Email is required' }));
      } else if (!validateEmail(value)) {
        setErrors((prev) => ({ ...prev, email: 'Please enter a valid email address' }));
      }
    }

    if (name === 'password') {
      if (!value) {
        setErrors((prev) => ({ ...prev, password: 'Password is required' }));
      } else if (value.length < 8) {
        setErrors((prev) => ({ ...prev, password: 'Password must be at least 8 characters' }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setServerError('');

    try {
      const result = await loginAdmin(formData.email, formData.password);

      if (result.success && result.data) {
        if (result.data.mustRotatePassword) {
          // Redirect to password rotation page (using settings for now)
          router.push('/admin/settings?rotatePassword=true');
        } else {
          router.push('/admin/dashboard');
        }
      } else {
        setServerError(result.error || 'Login failed. Please check your credentials.');
      }
    } catch {
      setServerError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-[360px]">
      <div className="space-y-5">
        <AdminInput
          label="Administrator Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="admin@appsc.gov.in"
          error={errors.email}
          required
        />
        <AdminInput
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="••••••••"
          error={errors.password}
          required
        />
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="pt-2">
        <AdminButton 
          type="submit" 
          isLoading={isSubmitting} 
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? 'Authenticating…' : 'Secure Access Login'}
        </AdminButton>
      </div>

      <p className="text-center text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
        Authorized Access Only. All activities are monitored for security compliance.
      </p>
    </form>
  );
};

export default AdminLoginForm;
