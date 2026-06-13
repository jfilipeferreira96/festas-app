import { auth } from "@festas/auth";
import type { Session, User } from "@festas/auth/types";
import { NextResponse } from "next/server";
import { t } from "@/lib/i18n-server";
import Logger from "@/lib/logger";

type FuncaoUtilizador = "ADMINISTRADOR" | "GESTOR" | "RECECAO" | "MARKETING";

/**
 * Resolves a Better Auth session from a Next.js Request (reads the session cookie).
 */
export async function getSession(request: Request): Promise<Session | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session ?? null;
  } catch (error) {
    Logger.error("getSession error:", error);
    return null;
  }
}

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Ensures the request is authenticated.
 * Returns the user on success, or a 401 NextResponse on failure.
 *
 * Usage:
 *   const auth = await requireAuth(request);
 *   if (!auth.ok) return auth.response;
 *   // auth.user is available here
 */
export async function requireAuth(request: Request): Promise<AuthResult> {
  const session = await getSession(request);
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: t("auth.unauthorized") }, { status: 401 }),
    };
  }
  return { ok: true, user: session.user };
}

/**
 * Checks the authenticated user's role. Must be used AFTER `requireAuth`.
 * Returns `null` when allowed, or a 403 NextResponse when denied.
 *
 * Usage:
 *   const denied = checkFuncao(user, "ADMINISTRADOR", "GESTOR");
 *   if (denied) return denied;
 */
export function checkFuncao(
  user: User,
  ...allowed: FuncaoUtilizador[]
): NextResponse | null {
  const userFuncao = (user as Record<string, unknown>).funcao as
    | FuncaoUtilizador
    | undefined;

  if (!userFuncao) {
    Logger.warn("User has no funcao assigned", { userId: user.id });
    return NextResponse.json({ error: t("auth.accessDenied") }, { status: 403 });
  }

  if (!allowed.includes(userFuncao)) {
    Logger.info("Funcao check failed", {
      userId: user.id,
      userFuncao,
      requiredFuncoes: allowed,
    });
    return NextResponse.json(
      { error: t("auth.insufficientPermissions") },
      { status: 403 }
    );
  }

  return null;
}
