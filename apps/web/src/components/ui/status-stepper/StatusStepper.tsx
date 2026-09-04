"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ReservaStep = "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA" | "CANCELADA";

interface StatusStepperProps {
  currentStatus: ReservaStep;
  className?: string;
  /** Compact mode for inline display (smaller circles, no labels) */
  compact?: boolean;
}

const steps: { key: Exclude<ReservaStep, "CANCELADA">; label: string }[] = [
  { key: "RESERVA", label: "Reserva" },
  { key: "CONFIRMADO", label: "Confirmado" },
  { key: "EM_CURSO", label: "Em curso" },
  { key: "CONCLUIDA", label: "Concluída" },
];

const stepOrder: Record<Exclude<ReservaStep, "CANCELADA">, number> = {
  RESERVA: 0,
  CONFIRMADO: 1,
  EM_CURSO: 2,
  CONCLUIDA: 3,
};

const stepColors: Record<Exclude<ReservaStep, "CANCELADA">, string> = {
  RESERVA: "bg-brand-500",
  CONFIRMADO: "bg-brand-500",
  EM_CURSO: "bg-brand-500",
  CONCLUIDA: "bg-brand-500",
};

const ringColors: Record<Exclude<ReservaStep, "CANCELADA">, string> = {
  RESERVA: "ring-primary-100",
  CONFIRMADO: "ring-primary-100",
  EM_CURSO: "ring-primary-100",
  CONCLUIDA: "ring-primary-100",
};

const StatusStepper: React.FC<StatusStepperProps> = ({
  currentStatus,
  className = "",
  compact = false,
}) => {
  // Special handling for CANCELADA
  const isCancelled = currentStatus === "CANCELADA";

  if (isCancelled) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={cn("flex flex-col items-center gap-1.5", compact && "gap-0.5")}>
              <div
                className={cn(
                  "rounded-full flex items-center justify-center font-bold transition-all duration-300",
                  compact ? "w-5 h-5 text-[10px]" : "w-8 h-8 text-xs",
                  "bg-red-100 text-accent-red"
                )}
              >
                <svg width={compact ? 10 : 14} height={compact ? 10 : 14} viewBox="0 0 14 14" fill="none">
                  <path
                    d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {!compact && (
                <span className="text-[11px] font-medium text-accent-red whitespace-nowrap">
                  {index === 0 ? "Cancelada" : "-"}
                </span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5", compact ? "mx-1" : "mx-2", "mt-[-18px]")}>
                <div className="h-full rounded-full bg-red-200" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const currentIndex = stepOrder[currentStatus as Exclude<ReservaStep, "CANCELADA">];

  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((step, index) => {
        const isCompleted = index <= currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <React.Fragment key={step.key}>
            {/* Step circle + label */}
            <div className={cn("flex flex-col items-center gap-1.5", compact && "gap-0.5")}>
              <div
                className={cn(
                  "rounded-full flex items-center justify-center font-bold transition-all duration-300",
                  compact ? "w-5 h-5 text-[10px]" : "w-8 h-8 text-xs",
                  isCompleted
                    ? `${stepColors[step.key]} text-white`
                    : "bg-gray-100 text-gray-400",
                  isCurrent && "ring-4 ring-offset-2",
                  isCurrent && ringColors[step.key]
                )}
              >
                {isCompleted ? (
                  <svg width={compact ? 10 : 14} height={compact ? 10 : 14} viewBox="0 0 14 14" fill="none">
                    <path
                      d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {!compact && (
                <span
                  className={cn(
                    "text-[11px] font-medium whitespace-nowrap",
                    isCompleted ? "text-text-primary" : "text-text-muted"
                  )}
                >
                  {step.label}
                </span>
              )}
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5", compact ? "mx-1" : "mx-2", compact ? "" : "mt-[-18px]")}>
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    index < currentIndex
                      ? stepColors[steps[index + 1].key]
                      : "bg-gray-200"
                  )}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export { StatusStepper };
export type { StatusStepperProps, ReservaStep };
