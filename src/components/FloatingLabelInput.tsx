import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

export const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  error,
  icon,
  type = 'text',
  value,
  id,
  className = '',
  onChange,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const isPassword = type === 'password';
  const effectiveType = isPassword ? (showPassword ? 'text' : 'password') : type;
  const isFloating = isFocused || Boolean(value);

  return (
    <div className="space-y-1">
      <div className="relative group">
        {/* Left Icon if provided */}
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none z-10">
            {icon}
          </div>
        )}

        {/* Input Element */}
        <input
          id={inputId}
          type={effectiveType}
          value={value}
          onChange={onChange}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={`w-full bg-[#060D24]/80 border ${
            error ? 'border-rose-500/70' : 'border-[#D4AF37]/30 group-hover:border-[#D4AF37]/60'
          } rounded-xl px-4 py-3.5 ${
            icon ? 'pl-11' : ''
          } ${isPassword ? 'pr-11' : ''} text-sm text-[#FAF8F3] placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 transition-all duration-200 ${className}`}
          placeholder={label}
          {...props}
        />

        {/* Floating Label */}
        <label
          htmlFor={inputId}
          className={`absolute left-0 pointer-events-none transition-all duration-200 ease-out text-xs ${
            icon ? 'ml-11' : 'ml-4'
          } ${
            isFloating
              ? '-top-2.5 bg-[#080E24] px-1.5 text-[11px] text-[#F5E7A3] font-medium tracking-wider uppercase'
              : 'top-1/2 -translate-y-1/2 text-[#C9C2A6]/60 text-sm'
          } ${isFocused ? 'text-[#D4AF37]' : ''}`}
        >
          {label}
        </label>

        {/* Password Show/Hide Toggle */}
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C9C2A6] hover:text-[#D4AF37] p-1 transition-colors z-10"
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}

        {/* Animated Gold Focus Underline Bar */}
        <div
          className={`absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-[#D4AF37] to-[#F5E7A3] transition-transform duration-300 ${
            isFocused ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </div>

      {/* Inline Calm Error Message */}
      {error && (
        <p className="text-[11px] text-rose-400 font-light pl-1 transition-all duration-200 animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
