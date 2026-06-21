import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getHomeRoute } from "@/lib/permissoes";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function RootProtectedPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");
  const userFuncao = (session.user as Record<string, unknown>).funcao as
    | FuncaoUtilizador
    | undefined;
  redirect(getHomeRoute(userFuncao));
}
