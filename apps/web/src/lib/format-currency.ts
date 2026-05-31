/**
 * Currency formatting utility using organization settings
 */

/** Map of currency code → symbol and locale for Intl.NumberFormat */
const CURRENCY_LOCALE_MAP: Record<string, { locale: string; symbol: string }> = {
  EUR: { locale: "pt-PT", symbol: "€" },
  USD: { locale: "en-US", symbol: "$" },
  BRL: { locale: "pt-BR", symbol: "R$" },
  GBP: { locale: "en-GB", symbol: "£" },
};

/**
 * Format a number as currency using the organization's currency setting
 * @param value - The numeric value to format
 * @param currency - ISO 4217 currency code (defaults to "EUR")
 * @param options - Intl.NumberFormat options overrides
 * @returns Formatted currency string (e.g., "1 234,56 €")
 */
export function formatCurrency(
  value: number,
  currency: string = "EUR",
  options?: Partial<Intl.NumberFormatOptions>
): string {
  const config = CURRENCY_LOCALE_MAP[currency] || CURRENCY_LOCALE_MAP.EUR;

  try {
    return new Intl.NumberFormat(config.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    }).format(value);
  } catch {
    // Fallback for unsupported currency codes
    return `${config.symbol}${value.toFixed(2)}`;
  }
}

/**
 * Get the currency symbol for a given currency code
 * @param currency - ISO 4217 currency code
 * @returns Currency symbol (e.g., "€", "$")
 */
export function getCurrencySymbol(currency: string = "EUR"): string {
  const config = CURRENCY_LOCALE_MAP[currency] || CURRENCY_LOCALE_MAP.EUR;
  return config.symbol;
}

/**
 * Format a number as a compact currency value (e.g., "€1.2K", "$3.4M")
 * Useful for dashboard cards with large numbers
 * @param value - The numeric value to format
 * @param currency - ISO 4217 currency code
 * @returns Compact formatted string
 */
export function formatCompactCurrency(
  value: number,
  currency: string = "EUR"
): string {
  const config = CURRENCY_LOCALE_MAP[currency] || CURRENCY_LOCALE_MAP.EUR;
  const symbol = config.symbol;

  if (value >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(1)}K`;
  }
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Format a date in the organization's timezone
 * @param date - Date string or Date object
 * @param timezone - IANA timezone identifier (defaults to "Europe/Lisbon")
 * @param options - Intl.DateTimeFormat options overrides
 * @returns Formatted date string
 */
export function formatDateInTimezone(
  date: string | Date,
  timezone: string = "Europe/Lisbon",
  options?: Partial<Intl.DateTimeFormatOptions>,
  locale: string = "pt-PT"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Map i18next locale codes to Intl-compatible locales
  const intlLocale = locale === "en" ? "en-GB" : locale === "pt-PT" ? "pt-PT" : locale;

  try {
    return new Intl.DateTimeFormat(intlLocale, {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    }).format(dateObj);
  } catch {
    // Fallback if timezone is invalid
    return dateObj.toLocaleDateString(intlLocale, options);
  }
}