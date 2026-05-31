"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

const QuantityStepper = React.memo<QuantityStepperProps>(({
  value,
  onChange,
  min = 0,
  max = 99,
  size = "md",
  disabled = false,
  className = "",
}) => {
  const handleDecrement = useCallback(() => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  }, [value, min, disabled, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  }, [value, max, disabled, onChange]);

  const sizeConfig = {
    sm: {
      button: "w-7 h-7 text-sm",
      display: "w-8 text-sm",
    },
    md: {
      button: "w-9 h-9 text-base",
      display: "w-10 text-base",
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={cn(
          config.button,
          "flex items-center justify-center rounded-[6px] border border-border bg-surface text-text-secondary transition-colors",
          "hover:bg-gray-50 hover:text-text-primary",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-text-secondary"
        )}
        aria-label="Diminuir quantidade"
      >
        −
      </button>
      <span
        className={cn(
          config.display,
          "flex items-center justify-center font-semibold text-text-primary tabular-nums"
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={cn(
          config.button,
          "flex items-center justify-center rounded-[6px] border border-border bg-surface text-text-secondary transition-colors",
          "hover:bg-gray-50 hover:text-text-primary",
          "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface disabled:hover:text-text-secondary"
        )}
        aria-label="Aumentar quantidade"
      >
        +
      </button>
    </div>
  );
});

QuantityStepper.displayName = "QuantityStepper";

export { QuantityStepper };
export type { QuantityStepperProps };
