import { cache } from "react";
import { auth } from "@festas/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Cached session getter — React's cache() deduplicates calls within
 * a single server render. Both RootLayout and ProtectedLayout can
 * call this safely; only one actual session validation occurs.
 */
export const getServerSession = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    return session ? JSON.parse(JSON.stringify(session)) : null;
  } catch {
    return null;
  }
});

export async function requireAuth() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/signin");
  }

  return session;
}

export async function requireGuest() {
  const session = await getServerSession();

  if (session?.user) {
    redirect("/");
  }

  return session;
}
