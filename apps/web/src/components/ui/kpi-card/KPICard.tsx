"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor?: string;
  backgroundColor?: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

const KPICard = React.memo<KPICardProps>(({
  title,
  value,
  icon,
  iconColor = "#4F8EF7",
  backgroundColor,
  subtitle,
  trend,
  className = "",
}) => {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-border p-5 flex items-start gap-4",
        className
      )}
      style={{
        boxShadow: "var(--shadow-card)",
        backgroundColor: backgroundColor || "var(--color-surface)"
      }}
    >
      <div
        className="flex items-center justify-center w-12 h-12 rounded-[10px] shrink-0"
        style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary truncate">
          {title}
        </p>
        <p className="font-poppins text-[28px] font-bold leading-tight text-text-primary mt-0.5">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-text-muted mt-1">{subtitle}</p>
        )}
        {trend && (
          <p
            className={cn(
              "text-xs font-medium mt-1",
              trend.isPositive ? "text-accent-green-500" : "text-accent-red-500"
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </p>
        )}
      </div>
    </div>
  );
});

KPICard.displayName = "KPICard";

export { KPICard };
