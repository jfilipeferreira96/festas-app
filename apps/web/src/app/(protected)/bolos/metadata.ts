import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Bolos",
  description: "Bolos da casa a encomendar, por data",
});
