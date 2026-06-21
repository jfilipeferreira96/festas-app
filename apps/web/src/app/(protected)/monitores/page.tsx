import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { hasAccess, getHomeRoute } from "@/lib/permissoes";
import MonitoresEscalacaoContent from "@/components/monitores/MonitoresEscalacaoContent";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function MonitoresPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  const userFuncao = (session.user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;
  if (!hasAccess(userFuncao, "monitores", "leitura")) {
    // Non-authorized roles are redirected to their own home route
    redirect(getHomeRoute(userFuncao));
  }

  return <MonitoresEscalacaoContent />;
}
