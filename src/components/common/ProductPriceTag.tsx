import React from 'react';
import { Product } from '../../types';
import { useCustomerCountry, resolveDisplayPrice } from '../../utils/countryContext';
import { formatINR } from '../../utils/currencyHelper';

interface ProductPriceTagProps {
  product: Product;
  licenseType?: 'standard' | 'commercial';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOriginalPrice?: boolean;
  showTierBadge?: boolean;
  className?: string;
  primaryColorClass?: string;
}

export const ProductPriceTag: React.FC<ProductPriceTagProps> = ({
  product,
  licenseType = 'standard',
  size = 'md',
  showOriginalPrice = true,
  showTierBadge = false,
  className = '',
  primaryColorClass = 'text-[#17345C]',
}) => {
  const { currentCountry, exchangeRates } = useCustomerCountry();

  // Authoritatively resolve price converted from admin USD to customer currency
  const resolved = resolveDisplayPrice(
    product,
    licenseType,
    currentCountry.code,
    exchangeRates
  );

  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm font-semibold',
    md: 'text-base font-bold',
    lg: 'text-lg font-bold',
    xl: 'text-2xl font-bold',
  }[size];

  return (
    <div className={`inline-flex items-baseline gap-1.5 flex-wrap ${className}`}>
      <span className={`font-serif ${sizeClasses} ${primaryColorClass}`}>
        {resolved.display}
      </span>
      {showOriginalPrice && resolved.originalDisplay && (
        <span className="text-xs text-[#687386] line-through font-normal">
          {resolved.originalDisplay}
        </span>
      )}
      {showTierBadge && resolved.isRegional && resolved.tierName && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#FFF9F0] border border-[#E8D7B7] text-[#B88732] font-medium tracking-wide">
          {resolved.tierName}
        </span>
      )}
    </div>
  );
};
