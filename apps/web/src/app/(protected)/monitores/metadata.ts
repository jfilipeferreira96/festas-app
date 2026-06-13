import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Monitores",
  description: "Escalação de monitores por dia e intervalo horário",
});
