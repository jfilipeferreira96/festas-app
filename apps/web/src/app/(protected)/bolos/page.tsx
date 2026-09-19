import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { hasAccess, getHomeRoute } from "@/lib/permissoes";
import BolosContent from "@/components/bolos/BolosContent";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function BolosPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  const userFuncao = (session.user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;
  if (!hasAccess(userFuncao, "reservas", "leitura")) {
    redirect(getHomeRoute(userFuncao));
  }

  return <BolosContent />;
}
