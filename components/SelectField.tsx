import React from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  options,
  error,
  required,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      <label
        htmlFor={selectId}
        className="text-sm font-bold text-slate-700 flex items-center gap-1 ml-0.5"
      >
        {label}
        {required && <span className="text-amber-500" aria-hidden="true">*</span>}
      </label>
      <div className="relative group">
        <select
          id={selectId}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          className={`w-full px-4 py-3 bg-white border-2 ${
            error 
              ? 'border-red-200 focus:border-red-500 focus:ring-red-50' 
              : 'border-slate-100 group-hover:border-amber-200 focus:border-indigo-500 focus:ring-indigo-50'
          } rounded-xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%2364748b%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.5rem_1.5rem] bg-[right_0.75rem_center] bg-no-repeat text-slate-800`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="py-2">
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-xs font-medium text-red-500 mt-1 ml-0.5" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default SelectField;
