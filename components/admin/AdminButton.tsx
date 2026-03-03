import React from 'react';

interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

const AdminButton: React.FC<AdminButtonProps> = ({
  children,
  className = '',
  isLoading = false,
  disabled,
  ...props
}) => {
  return (
    <button
      className={`w-full px-6 py-3.5 rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 active:scale-[0.99] shadow-md hover:shadow-lg ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="tracking-wide text-[13px] animate-pulse">Authenticating Session...</span>
        </>
      ) : (
        <span className="tracking-wide text-[13px]">{children}</span>
      )}
    </button>
  );
};

export default AdminButton;
