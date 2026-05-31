import ResetPasswordConfirmForm from "@/components/auth/ResetPasswordConfirmForm";
import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";

export const metadata: Metadata = createPageMetadata({
  title: "Confirmar Reposição de Palavra-passe",
  description: PAGE_DESCRIPTIONS.RESET_PASSWORD_CONFIRM,
  keywords: PAGE_KEYWORDS.RESET_PASSWORD_CONFIRM,
});

export default function ResetPasswordConfirmPage() {
  return <ResetPasswordConfirmForm />;
}
