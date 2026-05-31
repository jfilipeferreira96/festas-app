import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Permissões",
  description: "Configuração de funções e acessos ao sistema (RBAC)",
});