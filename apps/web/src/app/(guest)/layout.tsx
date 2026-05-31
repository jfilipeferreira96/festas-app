import { redirect } from "next/navigation";
import { requireGuest } from "@/lib/session";

export default async function GuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Validar que usuário não está autenticado server-side
  const session = await requireGuest();

  // Se já há sessão, a função requireGuest já fará o redirect
  if (session?.user) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
