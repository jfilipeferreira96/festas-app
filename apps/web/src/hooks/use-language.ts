"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Language, getStoredLanguage, setStoredLanguage, getBrowserLanguage, DEFAULT_LANGUAGE, changeLanguage, getCurrentLanguageFromI18n } from "@/lib/language";

export function useLanguage() {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);
  const [isClient, setIsClient] = useState(false);
  const { i18n } = useTranslation();

  useEffect(() => {
    setIsClient(true);
    
    // Try to get stored language first, then browser language
    const storedLanguage = getStoredLanguage();
    const browserLanguage = getBrowserLanguage();
    const initialLanguage = storedLanguage || browserLanguage;
    
    setLanguageState(initialLanguage);
    
    // Sync i18n if language is different
    if (i18n.language !== initialLanguage) {
      changeLanguage(initialLanguage);
    }
  }, [i18n]);

  // Listen for i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const newLanguage = lng as Language;
      if (newLanguage !== language) {
        setLanguageState(newLanguage);
      }
    };

    i18n.on('languageChanged', handleLanguageChanged);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n, language]);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    setStoredLanguage(newLanguage);
    changeLanguage(newLanguage);
  };

  return {
    language,
    setLanguage,
    isClient,
    // Expose i18n instance for direct access if needed
    i18n,
  };
}
