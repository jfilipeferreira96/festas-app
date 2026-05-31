import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = createPageMetadata({
  title: "Entrar",
  description: PAGE_DESCRIPTIONS.LOGIN,
  keywords: PAGE_KEYWORDS.LOGIN,
});

export default function SignInPage() {
  return <SignInForm />;
}
