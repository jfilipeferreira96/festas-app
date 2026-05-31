import OtpForm from "@/components/auth/OtpForm";
import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";

export const metadata: Metadata = createPageMetadata({
  title: "Verificação em Duas Etapas",
  description: PAGE_DESCRIPTIONS.TWO_STEP_VERIFICATION,
  keywords: PAGE_KEYWORDS.TWO_STEP_VERIFICATION,
});

export default function TwoStepVerification() {
  return <OtpForm />;
}
