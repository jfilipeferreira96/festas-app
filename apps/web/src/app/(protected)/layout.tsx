import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import ProtectedProviders from "./ProtectedProviders";
import AppSidebar from "@/layout/AppSidebar";
import MobileSidebarToggle from "@/layout/MobileSidebarToggle";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";
import { SHOW_TOP_BAR } from "./layout-config";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  if (!session?.user) {
    redirect("/entrar");
  }

  // Roles focados numa única página (CACIFOS, FESTAS_ACABAR) — sem menu lateral.
  const isSidebarHidden =
    (session.user as { funcao?: string }).funcao === "CACIFOS" ||
    (session.user as { funcao?: string }).funcao === "FESTAS_ACABAR";

  return (
    <ProtectedProviders>
      <div className="flex min-h-screen">
        {!isSidebarHidden && <AppSidebar user={session.user} />}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 print:ml-0 ${
            isSidebarHidden ? "" : "lg:ml-[220px]"
          }`}
        >
          {SHOW_TOP_BAR || isSidebarHidden ? (
            <AppHeader user={session.user} hideSidebarToggle={isSidebarHidden} />
          ) : (
            <MobileSidebarToggle />
          )}
          <main
            className={`flex-1 p-4 md:p-6 bg-background print:p-0 ${
              SHOW_TOP_BAR || isSidebarHidden ? "" : "mt-12 lg:mt-0"
            }`}
          >
            {children}
          </main>
          {!isSidebarHidden && <Backdrop />}
        </div>
      </div>
    </ProtectedProviders>
  );
}
