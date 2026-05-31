import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";

export const metadata: Metadata = createPageMetadata({
  title: "Recuperar Palavra-passe",
  description: PAGE_DESCRIPTIONS.RESET_PASSWORD,
  keywords: PAGE_KEYWORDS.RESET_PASSWORD,
});

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}