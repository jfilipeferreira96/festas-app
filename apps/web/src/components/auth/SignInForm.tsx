"use client";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Button } from "@/components/ui";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();
  const { success, handleApiError } = useToast();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.error) {
        handleApiError(result.error, t("auth.signIn.errors.loginFailed"));
      } else {
        success(t("auth.signIn.errors.loginSuccess"));
        router.push("/dashboard");
      }
    } catch (error) {
      handleApiError(error, t("auth.signIn.errors.unexpectedError"));
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">{t("auth.signIn.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("auth.signIn.subtitle")}</p>
          </div>
          <div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                <div>
                  <Label>
                    {t("auth.signIn.emailLabel")} <span className="text-error-500">*</span>{" "}
                  </Label>
                  <Input
                    type="email"
                    placeholder={t("auth.signIn.emailPlaceholder")}
                    {...register("email")}
                    error={!!errors.email}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                  )}
                </div>
                <div>
                  <Label>
                    {t("auth.signIn.passwordLabel")} <span className="text-error-500">*</span>{" "}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={t("auth.signIn.passwordPlaceholder")}
                      {...register("password")}
                      error={!!errors.password}
                    />
                    <span onClick={() => setShowPassword(!showPassword)} className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2">
                      {showPassword ? <EyeIcon className="fill-gray-500 dark:fill-gray-400" /> : <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />}
                    </span>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={isChecked} 
                      onChange={(e) => setIsChecked(e.target.checked)} 
                    />
                    <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">{t("auth.signIn.rememberMe")}</span>
                  </div>
                  <Link href="/recuperar-palavra-passe" className="text-sm text-brand-500 hover:text-brand-600 transition-colors duration-200">
                    {t("auth.signIn.forgotPassword")}
                  </Link>
                </div>
                <div>
                  <Button className="w-full" size="sm" disabled={isSubmitting}>
                    {isSubmitting ? t("common.loading") : t("auth.signIn.signInButton")}
                  </Button>
                </div>
              </div>
            </form>

            {/* Criação de conta pública desativada — todas as contas são criadas internamente (Utilizadores).
            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                {t("auth.signIn.dontHaveAccount")} {""}
                <Link href="/registar" className="text-brand-500 hover:text-brand-600 transition-colors duration-200">
                  {t("auth.signIn.signUpLink")}
                </Link>
              </p>
            </div>
            */}
          </div>
        </div>
      </div>
    </div>
  );
}