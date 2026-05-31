import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/session";
import ProtectedProviders from "./ProtectedProviders";
import AppSidebar from "@/layout/AppSidebar";
import AppHeader from "@/layout/AppHeader";
import Backdrop from "@/layout/Backdrop";

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
        <div className="flex-1 flex flex-col lg:ml-[220px] transition-all duration-300">
          <AppHeader user={session.user} />
          <main className="flex-1 p-4 md:p-6 bg-background">
            {children}
          </main>
          <Backdrop />
        </div>
      </div>
    </ProtectedProviders>
  );
}
