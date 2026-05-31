"use client";

import { SidebarProvider } from "@/contexts/SidebarContext";

export default function ProtectedProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SidebarProvider>{children}</SidebarProvider>;
}
