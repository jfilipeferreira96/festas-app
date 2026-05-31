/**
 * Currency formatting utilities
 */

export interface CurrencyConfig {
  symbol: string;
  code: string;
  position: 'before' | 'after';
}

export const CURRENCY_CONFIGS: Record<string, CurrencyConfig> = {
  EUR: {
    symbol: '€',
    code: 'EUR',
    position: 'after'
  },
  USD: {
    symbol: '$',
    code: 'USD',
    position: 'before'
  },
  GBP: {
    symbol: '£',
    code: 'GBP',
    position: 'before'
  },
  BRL: {
    symbol: 'R$',
    code: 'BRL',
    position: 'before'
  },
  CAD: {
    symbol: 'C$',
    code: 'CAD',
    position: 'before'
  },
  AUD: {
    symbol: 'A$',
    code: 'AUD',
    position: 'before'
  },
  JPY: {
    symbol: '¥',
    code: 'JPY',
    position: 'before'
  },
  CHF: {
    symbol: 'CHF',
    code: 'CHF',
    position: 'before'
  }
};

/**
 * Format price with currency symbol
 * @param price - The price amount
 * @param currency - The currency code (EUR, USD, etc.)
 * @returns Formatted price string
 */
export function formatPrice(price: number | string, currency: string = 'EUR'): string {
  const config = CURRENCY_CONFIGS[currency.toUpperCase()] || CURRENCY_CONFIGS.EUR;
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  const formattedPrice = numericPrice.toFixed(2);
  
  if (config.position === 'before') {
    return `${config.symbol}${formattedPrice}`;
  } else {
    return `${formattedPrice}${config.symbol}`;
  }
}

/**
 * Get currency symbol by code
 * @param currency - The currency code
 * @returns The currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const config = CURRENCY_CONFIGS[currency.toUpperCase()];
  return config?.symbol || '€';
}

/**
 * Format reservation lead time
 * @param minutes - Time in minutes
 * @returns Formatted time string
 */
export function formatReservationLeadTime(minutes: number | null | undefined): string {
  if (!minutes || minutes === 0) {
    return '-';
  }
  
  if (minutes < 60) {
    return `${minutes} min antes`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h antes`;
  }
  
  return `${hours}h ${remainingMinutes}min antes`;
}
