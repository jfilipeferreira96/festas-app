import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { hasAccess, getHomeRoute } from "@/lib/permissoes";
import ConfigCacifosContent from "@/components/configuracoes/ConfigCacifosContent";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function ConfigCacifosPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  const userFuncao = (session.user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;
  // Only roles with configuracoes read access can configure cacifos
  if (!hasAccess(userFuncao, "configuracoes", "leitura")) {
    redirect(getHomeRoute(userFuncao));
  }

  return <ConfigCacifosContent />;
}
