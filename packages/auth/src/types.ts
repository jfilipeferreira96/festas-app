import { auth } from "./index";
import type { Request } from "express";

// ===================================
// Better Auth Types
// ===================================
export type Session = typeof auth.$Infer.Session;

// ===================================
// User & Authentication Types
// ===================================
export type User = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>["user"];
export type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

// ===================================
// Server Request Types
// ===================================
export interface AuthenticatedExpressRequest extends Request {
  user: User;
}

export interface PossiblyAuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Helper type for controllers that require authentication
 * Use this instead of (req as any).user
 */
export type AuthenticatedControllerRequest = AuthenticatedExpressRequest;

// ===================================
// Helper Functions & Type Guards
// ===================================
/**
 * Type guard to check if a request is authenticated
 */
export function isAuthenticated(req: PossiblyAuthenticatedRequest): req is AuthenticatedExpressRequest {
  return req.user !== undefined;
}
