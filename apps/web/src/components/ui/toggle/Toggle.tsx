"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

const Toggle = React.memo<ToggleProps>(({
  enabled,
  onChange,
  label,
  disabled = false,
  size = "md",
  className = "",
}) => {
  const sizeConfig = {
    sm: {
      track: "w-9 h-5",
      thumb: "w-3.5 h-3.5",
      translate: "translate-x-4",
    },
    md: {
      track: "w-11 h-6",
      thumb: "w-4.5 h-4.5",
      translate: "translate-x-5",
    },
  };

  const config = sizeConfig[size];

  return (
    <label
      className={cn(
        "inline-flex items-center gap-3 cursor-pointer",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => !disabled && onChange(!enabled)}
        className={cn(
          config.track,
          "relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-2",
          enabled ? "bg-brand-500" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            config.thumb,
            "inline-block rounded-full bg-white shadow-theme-xs transform transition-transform duration-200 ease-in-out",
            enabled ? config.translate : "translate-x-0.5"
          )}
          style={{ marginTop: "2px" }}
        />
      </button>
      {label && (
        <span className="text-sm font-medium text-text-primary">
          {label}
        </span>
      )}
    </label>
  );
});

Toggle.displayName = "Toggle";

export { Toggle };
export type { ToggleProps };
