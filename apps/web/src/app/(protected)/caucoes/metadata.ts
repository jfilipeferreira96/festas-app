import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Cauções",
  description: "Controlo de cauções — pagas e por pagar",
});
