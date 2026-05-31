import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import ptPTTranslations from '../locales/pt-PT/common.json';

// Supported languages - only pt-PT
export const supportedLanguages = ['pt-PT'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// Translation resources
const resources = {
  'pt-PT': {
    common: ptPTTranslations,
  },
};

// Configure i18n but don't initialize automatically
i18n.use(initReactI18next);

// Export configured i18n instance
export default i18n;

// Helper functions
export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage || 'pt-PT';
};

export const changeLanguage = (language: SupportedLanguage) => {
  i18n.changeLanguage(language);
  
  // Update localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('app-language', language);
  }
  
  // Update cookie for backend synchronization
  if (typeof document !== 'undefined') {
    document.cookie = `locale=${language}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

export const getTranslation = (key: string, options?: any) => {
  return i18n.t(key, options);
};

// Export for use in components
export { i18n };

// Export initialization function
export const initializeI18n = () => {
  return i18n.init({
    resources,
    lng: 'pt-PT', // Always use pt-PT
    fallbackLng: 'pt-PT',
    debug: false,
    
    // Default namespace
    defaultNS: 'common',
    
    // Load all namespaces
    ns: ['common'],
    
    // Interpolation configuration
    interpolation: {
      escapeValue: false, // React already escapes by default
    },
  });
};
