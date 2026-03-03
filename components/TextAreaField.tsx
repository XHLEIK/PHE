import React from 'react';

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const TextAreaField: React.FC<TextAreaFieldProps> = ({
  label,
  error,
  icon,
  required,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <label
        htmlFor={inputId}
        className="text-sm font-bold text-slate-700 flex items-center gap-1 ml-0.5"
      >
        {label}
        {required && <span className="text-amber-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative group">
        <textarea
          id={inputId}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          className={`w-full px-4 py-3 bg-white border-2 ${
            error 
              ? 'border-red-200 focus:border-red-500 focus:ring-red-50' 
              : 'border-slate-100 group-hover:border-amber-200 focus:border-indigo-500 focus:ring-indigo-50'
          } rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 pr-10 min-h-[140px] resize-y text-slate-800 placeholder:text-slate-400`}
          {...props}
        />
        {icon && (
          <div className="absolute top-4 right-0 pr-3.5 flex items-start pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-red-500 mt-1 ml-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextAreaField;
