import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Extras",
  description: "Gestão de extras disponíveis para reservas",
});