"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { I18nProvider } from "@/providers/I18nProvider";
import type { User } from "@/contexts/AuthContext";

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function Providers({ children, initialUser }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider initialUser={initialUser}>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
      <Toaster
        richColors 
        position="top-right"
        expand={false}
      />
    </QueryClientProvider>
  );
}
