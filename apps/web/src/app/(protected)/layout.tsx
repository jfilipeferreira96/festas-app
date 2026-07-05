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

  return (
    <ProtectedProviders>
      <div className="flex min-h-screen">
        <AppSidebar user={session.user} />
        <div className="flex-1 flex flex-col lg:ml-[220px] transition-all duration-300 print:ml-0">
          {SHOW_TOP_BAR ? (
            <AppHeader user={session.user} />
          ) : (
            <MobileSidebarToggle />
          )}
          <main
            className={`flex-1 p-4 md:p-6 bg-background print:p-0 ${
              SHOW_TOP_BAR ? "" : "mt-12 lg:mt-0"
            }`}
          >
            {children}
          </main>
          <Backdrop />
        </div>
      </div>
    </ProtectedProviders>
  );
}
