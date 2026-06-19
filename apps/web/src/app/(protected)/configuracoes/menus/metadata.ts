import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Menus & Extras",
  description: "Gestão de itens de menu e extras disponíveis para reservas",
});