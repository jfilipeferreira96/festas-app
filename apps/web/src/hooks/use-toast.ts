"use client";

import { toast } from "sonner";
import { useTranslation } from "@/hooks/use-translation";

export interface ToastOptions {
  duration?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  dismissible?: boolean;
}

export function useToast() {
  const { t } = useTranslation();

  const success = (message: string, options?: ToastOptions) => {
    return toast.success(message, {
      duration: 4000,
      ...options,
    });
  };

  const errorToast = (message?: string, fallback?: string, options?: ToastOptions) => {
    const errorMessage = message || fallback || t("hooks.toast.unexpectedError");
    return toast.error(errorMessage, {
      duration: 6000,
      ...options,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    return toast.info(message, {
      duration: 4000,
      ...options,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    return toast.warning(message, {
      duration: 5000,
      ...options,
    });
  };

  const loading = (message: string, options?: ToastOptions) => {
    return toast.loading(message, options);
  };

  // Helper para tratamento de erros da API
  const handleApiError = (apiError: any, fallbackMessage?: string) => {
    // Se for um erro da API com mensagem
    if (apiError?.error) {
      return errorToast(apiError.error, fallbackMessage);
    }
    
    // Se for um erro com message property
    if (apiError?.message) {
      return errorToast(apiError.message, fallbackMessage);
    }
    
    // Se for uma string
    if (typeof apiError === "string") {
      return errorToast(apiError, fallbackMessage);
    }
    
    // Fallback para mensagem genérica
    return errorToast(undefined, fallbackMessage || t("hooks.toast.serverConnectionError"));
  };

  return {
    success,
    error: errorToast,
    info,
    warning,
    loading,
    handleApiError,
  };
}

export default useToast;
