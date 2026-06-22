import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { hasAccess, getHomeRoute } from "@/lib/permissoes";
import ClientesContent from "@/components/clientes/ClientesContent";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function ClientesPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  const userFuncao = (session.user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;
  // Only roles with clientes read access can see /clientes
  if (!hasAccess(userFuncao, "clientes", "leitura")) {
    redirect(getHomeRoute(userFuncao));
  }

  return <ClientesContent />;
}
