import { Metadata } from "next";
import { createPageMetadata } from "@/lib/metadata";
import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = createPageMetadata({
  title: "Registar",
  description: PAGE_DESCRIPTIONS.SIGNUP,
  keywords: PAGE_KEYWORDS.SIGNUP,
});

export default function SignUpPage() {
  return <SignUpForm />;
}