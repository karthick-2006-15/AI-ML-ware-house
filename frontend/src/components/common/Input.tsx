import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  unit?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  unit,
  error,
  id,
  className = '',
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <div className="flex justify-between items-center">
          <label htmlFor={inputId} className="text-xs font-semibold text-slate-300 tracking-wide">
            {label}
          </label>
          {unit && <span className="text-[11px] text-slate-400 font-mono">{unit}</span>}
        </div>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full bg-[#08182A] border text-slate-100 placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-sm transition-all duration-150 focus:outline-none focus:border-[#1683FF] focus:ring-1 focus:ring-[#1683FF] ${
            error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : 'border-[#1A2D4A] hover:border-[#254168]'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[11px] text-rose-400 font-medium">{error}</p>}
      {helperText && !error && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};

export default Input;
