"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";

export const useSignOut = () => {
  const router = useRouter();
  const { signOut } = useUser();
  const { success, handleApiError } = useToast();
  const { t } = useTranslation();

  const handleSignOut = async (redirectPath: string = "/entrar") => {
    try {
      await signOut();
      router.push(redirectPath as any);
    } catch (error) {
      handleApiError(error, t("hooks.signOut.logoutFailed"));
      // Even if there's an error, try to redirect
      router.push(redirectPath as any);
    }
  };

  return { handleSignOut };
};
