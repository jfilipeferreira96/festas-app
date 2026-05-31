import { getCurrentLanguage, changeLanguage as i18nChangeLanguage } from './i18n';

export type Language = "pt-PT";

export const SUPPORTED_LANGUAGES: Record<Language, { name: string; flag: string; nativeName?: string }> = {
  "pt-PT": {
    name: "Português (Portugal)",
    flag: "🇵🇹",
    nativeName: "Português"
  }
};

export const DEFAULT_LANGUAGE: Language = "pt-PT";

export const LANGUAGE_STORAGE_KEY = "app-language";

export function getStoredLanguage(): Language {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return (stored as Language) || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function setStoredLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function getBrowserLanguage(): Language {
  // Always return pt-PT since it's the only supported language
  return DEFAULT_LANGUAGE;
}

// New function to set locale cookie for backend synchronization
export function setLocaleCookie(language: Language): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `locale=${language}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Silently fail if document.cookie is not available
  }
}

// New function to get locale from cookie
export function getLocaleCookie(): Language | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'locale') {
        return value as Language;
      }
    }
  } catch {
    // Silently fail if document.cookie is not available
  }
  return null;
}

// Updated changeLanguage function to integrate with i18n
export function changeLanguage(language: Language): void {
  // Update localStorage
  setStoredLanguage(language);
  
  // Update cookie for backend synchronization
  setLocaleCookie(language);
  
  // Update i18next instance
  i18nChangeLanguage(language);
}

// Function to get current language from i18n
export function getCurrentLanguageFromI18n(): Language {
  return getCurrentLanguage();
}
