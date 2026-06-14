import { auth } from "@festas/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth catch-all route handler.
 *
 * Replaces the Express mounting of `toNodeHandler(auth)` on `/api/auth`.
 * All Better Auth endpoints (/api/auth/sign-in, /api/auth/sign-up, etc.) are
 * served from here.
 */
export const { GET, POST } = toNextJsHandler(auth);
