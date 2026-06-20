// import { Metadata } from "next";
// import { createPageMetadata } from "@/lib/metadata";
// import { PAGE_DESCRIPTIONS, PAGE_KEYWORDS } from "@/lib/metadata-constants";
// import SignUpForm from "@/components/auth/SignUpForm";
//
// export const metadata: Metadata = createPageMetadata({
//   title: "Registar",
//   description: PAGE_DESCRIPTIONS.SIGNUP,
//   keywords: PAGE_KEYWORDS.SIGNUP,
// });
//
// export default function SignUpPage() {
//   return <SignUpForm />;
// }

/**
 * Criação de conta pública DESATIVADA.
 *
 * Todas as contas são criadas internamente pela área de Utilizadores
 * (ver apps/web/src/services/utilizador.service.ts → auth.api.signUpEmail).
 *
 * O código original foi comentado para preservar a rota e facilitar
 * a reativação num projeto futuro.
 */
export default function SignUpPage() {
  return null;
}