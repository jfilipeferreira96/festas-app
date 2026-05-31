import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Utilizadores",
  description: "Gestão de utilizadores e acessos ao sistema",
});