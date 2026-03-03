import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gradient';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'gradient',
  isLoading = false,
  disabled,
  ...props
}) => {
  const baseStyles = 'px-6 py-3.5 rounded-xl font-bold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-200 shadow-lg shadow-indigo-100',
    secondary: 'bg-white text-slate-700 border-2 border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 focus:ring-indigo-50',
    gradient: 'bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-700 text-white hover:shadow-xl hover:shadow-indigo-200/50 focus:ring-purple-200 shadow-lg shadow-indigo-100',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="animate-pulse">Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
