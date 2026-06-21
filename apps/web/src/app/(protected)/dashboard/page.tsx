import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { getHomeRoute } from "@/lib/permissoes";
import { PageHeader } from "@/components/ui";
import DashboardContent from "@/components/dashboard/DashboardContent";
import type { FuncaoUtilizador } from "@saas/shared-types";

export default async function DashboardPage() {
  const session = await requireAuth();
  if (!session?.user) redirect("/entrar");

  // Non-admins are redirected to their role-specific home route
  const userFuncao = (session.user as Record<string, unknown>).funcao as
    | FuncaoUtilizador
    | undefined;
  const home = getHomeRoute(userFuncao);
  if (home !== "/dashboard") {
    redirect(home);
  }

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="mt-4">
        <DashboardContent />
      </div>
    </div>
  );
}
