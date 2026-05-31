"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface FormStepperProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (step: number) => void;
  completedSteps?: number[];
  className?: string;
}

const FormStepper: React.FC<FormStepperProps> = ({
  steps,
  currentStep,
  onStepChange,
  completedSteps = [],
  className,
}) => {
  return (
    <div className={cn("flex items-center w-full", className)}>
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index) || index < currentStep;
        const isCurrent = index === currentStep;
        const isClickable = isCompleted || index <= currentStep + 1;

        return (
          <React.Fragment key={step.key}>
            {/* Step circle + label */}
            <button
              type="button"
              onClick={() => isClickable && onStepChange(index)}
              disabled={!isClickable}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-all",
                isClickable ? "cursor-pointer" : "cursor-not-allowed opacity-50"
              )}
            >
              <div
                className={cn(
                  "rounded-full flex items-center justify-center font-bold transition-all duration-300",
                  "w-9 h-9 text-sm",
                  isCompleted && !isCurrent
                    ? "bg-accent-green-400 text-white"
                    : isCurrent
                    ? "bg-brand-500 text-white ring-4 ring-brand-100"
                    : "bg-gray-100 text-gray-400"
                )}
              >
                {isCompleted && !isCurrent ? (
                  <Check size={16} />
                ) : step.icon ? (
                  step.icon
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  isCurrent
                    ? "text-brand-600"
                    : isCompleted
                    ? "text-accent-green-600"
                    : "text-text-muted"
                )}
              >
                {step.label}
              </span>
            </button>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mt-[-18px]">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    index < currentStep
                      ? "bg-accent-green-400"
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

export { FormStepper };
export type { FormStepperProps, Step };