import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/utils";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: (failureCount, error) => {
        // Never retry on 401 - session is invalid
        if (error instanceof ApiError && error.status === 401) return false;
        // Don't retry on 403/404 - the resource doesn't exist or access is denied
        if (error instanceof ApiError && (error.status === 403 || error.status === 404)) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
  queryCache: undefined, // configured below via event listener
});

/**
 * Global handler: if any query fails with 401, the session is dead.
 * Redirect to /signin with a full page reload to clear all client state.
 * Guard: skip redirect if already on an auth/guest page to prevent loops.
 */
queryClient.getQueryCache().config.onError = (error) => {
  if (error instanceof ApiError && error.status === 401) {
    // Don't redirect if already on a guest/auth page - avoid infinite loops
    const path = window.location.pathname;
    const guestPaths = ["/", "/signin", "/signup", "/reset-password", "/reset-password-confirm"];
    if (guestPaths.some((p) => path === p || path.startsWith(p))) {
      return;
    }
    // Full page reload clears all React state, TanStack cache, etc.
    // The protected layout's requireAuth() will ensure proper redirect
    window.location.href = "/signin";
  }
};
