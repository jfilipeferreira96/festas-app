"use client";

import { useEffect, useState } from "react";
import i18n, { initializeI18n } from '@/lib/i18n';
import { DEFAULT_LANGUAGE } from "@/lib/language";

interface I18nProviderProps {
  children: React.ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [isI18nInitialized, setIsI18nInitialized] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const initializeLanguage = async () => {
      try {
        // Initialize i18n if not already initialized
        if (!i18n.isInitialized) {
          await initializeI18n();
        }

        // Always use pt-PT
        if (i18n.language !== DEFAULT_LANGUAGE) {
          await i18n.changeLanguage(DEFAULT_LANGUAGE);
        }

        setIsI18nInitialized(true);
      } catch (error) {
        console.error("Error initializing i18n:", error);
        setIsI18nInitialized(true);
      }
    };

    initializeLanguage();
  }, []);

  // Show a simple loading state while i18n initializes
  if (!isI18nInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}
