import React, { useState, useRef, useEffect } from 'react';
import { useCustomerCountry } from '../../utils/countryContext';
import { Globe, Search, Check, ChevronDown, Sparkles } from 'lucide-react';

interface CountrySelectorProps {
  variant?: 'navbar' | 'compact' | 'footer' | 'mobile';
  className?: string;
}

export const CountrySelector: React.FC<CountrySelectorProps> = ({
  variant = 'navbar',
  className = '',
}) => {
  const { currentCountry, availableCountries, setCountry, isDetecting } = useCustomerCountry();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredCountries = availableCountries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.currency.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={
          variant === 'mobile'
            ? 'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#FFF9F0] border border-[#E8D7B7] text-xs font-semibold text-[#17345C] hover:border-[#D9B66F] transition-all'
            : 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#FFF9F0]/90 hover:bg-[#FFF9F0] border border-[#E8D7B7] hover:border-[#D9B66F] text-xs font-semibold text-[#17345C] transition-all shadow-xs'
        }
        title={`Shipping & Pricing Region: ${currentCountry.name} (${currentCountry.currency})`}
      >
        <span className="text-sm leading-none" role="img" aria-label={currentCountry.name}>
          {currentCountry.flag}
        </span>
        <span className="text-[11px] font-bold text-[#17345C] tracking-wide">
          {currentCountry.code}
        </span>
        <span className="text-[10px] font-medium text-[#B88732] font-mono">
          ({currentCountry.symbol} {currentCountry.currency})
        </span>
        <ChevronDown className={`w-3 h-3 text-[#B88732] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={
            variant === 'mobile'
              ? 'mt-2 w-full bg-white rounded-2xl border border-[#E8D7B7] shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150'
              : 'absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-[#E8D7B7] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150'
          }
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E8D7B7]/50">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#17345C]">
              <Globe className="w-3.5 h-3.5 text-[#B88732]" />
              <span>Select Region & Currency</span>
            </div>
            {isDetecting ? (
              <span className="text-[10px] text-[#B88732] animate-pulse">Detecting...</span>
            ) : (
              <span className="text-[10px] font-mono text-[#687386]">ISO Alpha-2</span>
            )}
          </div>

          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-[#687386] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search country or currency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FFFDF9] border border-[#E8D7B7] rounded-xl focus:outline-none focus:border-[#D9B66F] text-[#17345C] placeholder:text-[#687386]/60"
            />
          </div>

          {/* Country List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredCountries.map((c) => {
              const isSelected = c.code === currentCountry.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCountry(c.code);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#17345C] text-white font-semibold'
                      : 'hover:bg-[#FFF9F0] text-[#17345C]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-tight">{c.name}</p>
                      <p
                        className={`text-[10px] font-mono ${
                          isSelected ? 'text-[#E8D7B7]' : 'text-[#687386]'
                        }`}
                      >
                        {c.code} • {c.currency} ({c.symbol})
                      </p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#D9B66F] flex-shrink-0" />}
                </button>
              );
            })}

            {filteredCountries.length === 0 && (
              <div className="py-6 text-center text-xs text-[#687386]">
                No countries found matching "{search}"
              </div>
            )}
          </div>

          {/* Luxury Footer Notice */}
          <div className="mt-2.5 pt-2 border-t border-[#E8D7B7]/40 flex items-center justify-between text-[10px] text-[#687386]">
            <span className="flex items-center gap-1 text-[#B88732]">
              <Sparkles className="w-2.5 h-2.5" /> Tier pricing active
            </span>
            <span className="italic">Auto-converted from USD</span>
          </div>
        </div>
      )}
    </div>
  );
};
