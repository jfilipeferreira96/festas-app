"use client";

import { useTranslation as useReactTranslation } from "react-i18next";

export function useTranslation(namespace = 'common') {
  const { t, i18n } = useReactTranslation(namespace);

  return {
    t,
    i18n,
    // Convenience method for nested keys
    tn: (key: string, options?: any) => t(`${namespace}:${key}`, options),
  };
}

// Re-export the default hook for compatibility
export { useTranslation as useReactTranslation } from "react-i18next";
