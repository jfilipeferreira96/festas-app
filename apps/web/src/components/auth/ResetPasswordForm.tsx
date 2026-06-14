"use client";
import React, { useState } from "react";
import Link from "next/link";
import Label from "../form/Label";
import Input from "@/components/form/input/InputField";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations/auth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function ResetPasswordForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { success, handleApiError } = useToast();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    
    try {
      const result = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/recuperar-palavra-passe-confirm",
      });

      if (result.error) {
        handleApiError(result.error, t("auth.resetPassword.errors.sendFailed"));
      } else {
        success(t("auth.resetPassword.errors.sendSuccess"));
        setIsSubmitted(true);
      }
    } catch (error) {
      handleApiError(error, t("auth.resetPassword.errors.unexpectedError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col flex-1 w-full">
        <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
          <div className="mb-5 sm:mb-8">
            <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full dark:bg-green-900/20">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md text-center">{t("auth.resetPassword.success.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {t("auth.resetPassword.success.message")}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t("auth.resetPassword.didntReceive")}{" "}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-brand-500 hover:text-brand-600 transition-colors duration-200"
                disabled={isLoading}
              >
                {t("auth.resetPassword.tryAgain")}
              </button>
            </p>
            <Link 
              href="/entrar" 
              className="inline-flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 transition bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("auth.resetPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 w-full">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">{t("auth.resetPassword.title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("auth.resetPassword.subtitle")}</p>
        </div>
        <div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-5">
              <div>
                <Label>
                  {t("auth.resetPassword.emailLabel")}<span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  id="email"
                  placeholder={t("auth.resetPassword.emailPlaceholder")}
                  {...register("email")}
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-all duration-200 shadow-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t("auth.resetPassword.sendingButton")}
                    </>
                  ) : (
                    t("auth.resetPassword.sendButton")
                  )}
                </button>
              </div>
            </div>
          </form>
          
          <div className="mt-5 text-center">
            <p className="text-sm font-normal text-gray-700 dark:text-gray-400">
              Lembrou-se da palavra-passe?{" "}
              <Link href="/entrar" className="text-brand-500 hover:text-brand-600 transition-colors duration-200">
                Iniciar Sessão
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}