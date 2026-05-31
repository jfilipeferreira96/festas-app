import React from "react";

type BadgeVariant = "light" | "solid";
type BadgeSize = "sm" | "md";
type BadgeColor =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "purple"
  | "teal"
  | "light"
  | "dark";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  color?: BadgeColor;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = "light",
  color = "primary",
  size = "md",
  startIcon,
  endIcon,
  children,
}) => {
  const baseStyles =
    "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-semibold";

  const sizeStyles = {
    sm: "text-[11px] leading-tight",
    md: "text-xs",
  };

  const variants = {
    light: {
      primary: "bg-primary-50 text-primary-500",
      secondary: "bg-secondary-50 text-secondary-500",
      success: "bg-accent-green-50 text-accent-green-600",
      warning: "bg-accent-orange-50 text-accent-orange-600",
      error: "bg-accent-red-50 text-accent-red-600",
      purple: "bg-accent-purple-50 text-accent-purple-500",
      teal: "bg-accent-teal-50 text-accent-teal-600",
      light: "bg-gray-100 text-gray-700",
      dark: "bg-gray-500 text-white",
    },
    solid: {
      primary: "bg-brand-500 text-white",
      secondary: "bg-secondary-400 text-white",
      success: "bg-accent-green-400 text-white",
      warning: "bg-accent-orange-400 text-white",
      error: "bg-accent-red-400 text-white",
      purple: "bg-accent-purple-400 text-white",
      teal: "bg-accent-teal-400 text-white",
      light: "bg-gray-400 text-white",
      dark: "bg-gray-700 text-white",
    },
  };

  const sizeClass = sizeStyles[size];
  const colorStyles = variants[variant][color];

  return (
    <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
      {startIcon && <span className="mr-1">{startIcon}</span>}
      {children}
      {endIcon && <span className="ml-1">{endIcon}</span>}
    </span>
  );
};

export default Badge;
