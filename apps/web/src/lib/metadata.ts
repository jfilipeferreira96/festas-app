import { Metadata } from "next";

interface PageMetadata {
  title: string;
  description?: string;
  keywords?: readonly string[] | string[];
  noIndex?: boolean;
}

export function createPageMetadata({
  title,
  description,
  keywords = [],
  noIndex = false
}: PageMetadata): Metadata {
  const baseTitle = "Gestão de Festas Infantis";
  const fullTitle = `${title} | ${baseTitle}`;
  
  // Default description if not provided
  const defaultDescription = `${title} - Gestão completa de festas infantis na plataforma ${baseTitle}`;
  
  // Convert readonly arrays to mutable arrays for keywords
  const keywordsArray = [...keywords, "festas infantis", "reservas", "Gestão de Festas Infantis"] as string[];
  
  return {
    title: fullTitle,
    description: description || defaultDescription,
    keywords: keywordsArray,
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
    openGraph: {
      title: fullTitle,
      description: description || defaultDescription,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: description || defaultDescription,
    },
  };
}
