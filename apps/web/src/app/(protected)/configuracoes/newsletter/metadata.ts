import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Newsletter",
  description: "Gestão de contactos e campanhas de email",
});