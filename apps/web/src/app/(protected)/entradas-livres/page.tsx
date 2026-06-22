import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { hasAccess, getHomeRoute } from "@/lib/permissoes";
import EntradasLivresTabela from "@/components/entradas-livres/EntradasLivresTabela";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function EntradasLivresPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  const userFuncao = (session.user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;
  // Only roles with reservas read access can see /entradas-livres
  if (!hasAccess(userFuncao, "reservas", "leitura")) {
    redirect(getHomeRoute(userFuncao));
  }

  // CACIFOS gets a toned-down (read-only, simplified) view
  const mode = userFuncao === "CACIFOS" ? "cacifos" : "full";

  return <EntradasLivresTabela mode={mode} />;
}
