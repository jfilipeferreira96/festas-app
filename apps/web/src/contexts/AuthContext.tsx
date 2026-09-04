"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, changePassword, deleteUser } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role?: string;
  funcao?: string;
  createdAt?: Date;
  updatedAt?: Date;
  emailVerified?: boolean;
  bio?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: {
    country?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    taxId?: string | null;
  } | null;
}

interface SessionResponse {
  data: {
    session: Record<string, unknown> | null;
    user: User | null;
  } | null;
  error: {
    code?: string;
    message?: string;
    status?: number;
    statusText?: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Module-level deduplication guard: if a session check is already in-flight,
 * subsequent callers reuse the same promise instead of firing another HTTP request.
 */
let pendingSessionPromise: Promise<void> | null = null;

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(() => {
    return initialUser === undefined;
  });
  const router = useRouter();
  const { success, handleApiError } = useToast();

  /**
   * Single session check with a 5-second timeout.
   * No retries - if this fails, the user is considered logged out.
   * Deduplicated: concurrent calls share the same in-flight request.
   */
  const checkSession = async (): Promise<void> => {
    // If a session check is already in-flight, reuse its promise
    if (pendingSessionPromise) return pendingSessionPromise;

    pendingSessionPromise = (async () => {
      setIsLoading(true);
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Session check timeout")), 5000);
        });

        const data: SessionResponse = await Promise.race([
          authClient.getSession(),
          timeoutPromise,
        ]);

        const sessionUser = data?.data?.user;
        if (sessionUser) {
          setUser(sessionUser);
        } else {
          setUser(null);
        }
      } catch {
        // Any error (timeout, network, etc.) - treat as logged out
        setUser(null);
      } finally {
        setIsLoading(false);
        pendingSessionPromise = null;
      }
    })();

    return pendingSessionPromise;
  };

  useEffect(() => {
    // If we have server-provided user info and user is authenticated
    if (initialUser !== undefined && initialUser !== null) {
      // Periodic session validation every 5 minutes for active sessions
      const interval = setInterval(() => {
        checkSession();
      }, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }

    // No server info or initialUser is null - perform a client-side session check.
    // This handles client-side navigation after login (e.g., router.push from /signin)
    // where the RootLayout hasn't re-rendered and initialUser is stale (null).
    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
      setUser(null);
    }, 8000);

    checkSession().finally(() => clearTimeout(safetyTimeout));

    return () => clearTimeout(safetyTimeout);
  }, [initialUser]);

  const signOut = async () => {
    try {
      setUser(null);
      await authClient.signOut();
      success("Logout realizado com sucesso!");
      router.replace("/entrar");
    } catch (error) {
      handleApiError(error, "Erro ao fazer logout");
    }
  };

  const changePasswordHandler = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      const result = await changePassword(data);
      if (result.data) {
        success("Senha alterada com sucesso!");
        return { success: true };
      } else {
        handleApiError(result.error, "Falha ao alterar senha");
        return { success: false, error: result.error?.message || "Failed to change password" };
      }
    } catch (error) {
      handleApiError(error, "Falha ao alterar senha");
      return { success: false, error: error instanceof Error ? error.message : "Failed to change password" };
    }
  };

  const deleteAccountHandler = async () => {
    try {
      const result = await deleteUser();
      if (result.data) {
        setUser(null);
        success("Conta excluída com sucesso!");
        return { success: true };
      } else {
        handleApiError(result.error, "Falha ao excluir conta");
        return { success: false, error: result.error?.message || "Failed to delete account" };
      }
    } catch (error) {
      handleApiError(error, "Falha ao excluir conta");
      return { success: false, error: error instanceof Error ? error.message : "Failed to delete account" };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    checkSession,
    changePassword: changePasswordHandler,
    deleteAccount: deleteAccountHandler,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within an AuthProvider");
  }
  return context;
}
