import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { hasAccess } from "@/lib/permissoes";
import FestasAcabarContent from "@/components/festas-acabar/FestasAcabarContent";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function FestasAcabarPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  const userFuncao = (session.user as Record<string, unknown>).funcao as FuncaoUtilizador | undefined;
  if (!hasAccess(userFuncao, "festas_acabar", "leitura")) {
    redirect("/dashboard");
  }

  return <FestasAcabarContent />;
}
