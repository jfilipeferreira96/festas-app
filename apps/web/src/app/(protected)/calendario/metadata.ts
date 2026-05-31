import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Calendário",
  description: "Visualização e gestão do calendário de festas",
});