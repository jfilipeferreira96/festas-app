// Global pagination configuration
export const PAGINATION_OPTIONS = [10, 20, 50, 100];

const STORAGE_KEY = 'bookings-rows-per-page';

export const getStoredRowsPerPage = (): number => {
  if (typeof window === 'undefined') return 10;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const value = stored ? parseInt(stored, 10) : 10;
    return PAGINATION_OPTIONS.includes(value) ? value : 10;
  } catch {
    return 10;
  }
};

export const setStoredRowsPerPage = (value: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, value.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
};
