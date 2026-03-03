'use client';

import React, { useState } from 'react';

interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const AdminInput: React.FC<AdminInputProps> = ({
  label,
  error,
  required,
  type = 'text',
  id,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password';
  const currentType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <label
        htmlFor={inputId}
        className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.1em] ml-1"
      >
        {label}
        {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <div className="relative group">
        <input
          id={inputId}
          type={currentType}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          className={`w-full px-4 py-3 bg-white border ${
            error 
              ? 'border-rose-200 focus:border-rose-500 focus:ring-rose-50' 
              : 'border-slate-200 group-hover:border-slate-300 focus:border-slate-900 focus:ring-slate-50'
          } rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 text-slate-900 placeholder:text-slate-300 text-sm font-medium`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-900 transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88 3.62 3.62"/><path d="M2 2l20 20"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><path d="M12 9a3 3 0 0 1 3 3 3 3 0 0 1-0.34 1.43"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-bold text-rose-600 mt-0.5 ml-1 animate-in fade-in slide-in-from-top-1 duration-200" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default AdminInput;
