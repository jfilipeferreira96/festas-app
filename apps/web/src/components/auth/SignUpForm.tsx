"use client";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Label from "@/components/ui/label";
import { Button } from "@/components/ui";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import Link from "next/link";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { signUp, signIn } from "@/lib/auth-client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const router = useRouter();
  const { success, handleApiError } = useToast();
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const fullName = `${data.firstName} ${data.lastName}`;

      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: fullName,
      });

      if (result.error) {
        handleApiError(result.error, t("auth.signUp.errors.registrationFailed"));
      } else {
        success(t("auth.signUp.errors.registrationSuccess"));
        // Success - redirect to dashboard
        router.push("/dashboard");
      }
    } catch (error) {
      handleApiError(error, t("auth.signUp.errors.unexpectedError"));
    }
  };
  return (
    <div className="flex flex-col flex-1 w-full no-scrollbar">

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">{t("auth.signUp.title")}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("auth.signUp.subtitle")}</p>
          </div>
          <div>
            
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- First Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      {t("auth.signUp.firstNameLabel")}<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder={t("auth.signUp.firstNamePlaceholder")}
                      {...register("firstName")}
                      error={!!errors.firstName}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                    )}
                  </div>
                  {/* <!-- Last Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      {t("auth.signUp.lastNameLabel")}<span className="text-error-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder={t("auth.signUp.lastNamePlaceholder")}
                      {...register("lastName")}
                      error={!!errors.lastName}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    {t("auth.signUp.emailLabel")}<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder={t("auth.signUp.emailPlaceholder")}
                    {...register("email")}
                    error={!!errors.email}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                  )}
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    {t("auth.signUp.passwordLabel")}<span className="text-error-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder={t("auth.signUp.passwordPlaceholder")}
                      type={showPassword ? "text" : "password"}
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
                {/* <!-- Button --> */}
                <div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? t("common.loading") : t("auth.signUp.signUpButton")}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                {t("auth.signUp.alreadyHaveAccount")} {" "}
                <Link href="/entrar" className="text-brand-500 hover:text-brand-600 transition-colors duration-200">
                  {t("auth.signUp.signInLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
