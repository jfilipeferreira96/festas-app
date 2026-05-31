"use client";

import React from "react";
import { useUser } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface GuestPageContainerProps {
  children: React.ReactNode;
  centered?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-full",
};

export default function GuestPageContainer({ children, centered = true, maxWidth = "md" }: GuestPageContainerProps) {
  const { isLoading } = useUser();

  // Loading state para páginas de auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="sm" />
        </div>
      </div>
    );
  }

  const contentClasses = centered ? `flex items-center justify-center min-h-screen bg-background px-4 sm:px-6 lg:px-8` : `min-h-screen bg-background`;

  const containerClasses = centered ? `w-full ${maxWidthClasses[maxWidth]}` : "w-full";

  return (
    <div className={contentClasses}>
      <div className={containerClasses}>{children}</div>
    </div>
  );
}
