"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";

// Paleta de cores da marca BasyLandy — fonte única em @saas/shared-defaults
import { FESTA_COLORS } from "@saas/shared-defaults";
export { FESTA_COLORS };

interface FestaColorPickerProps {
  value: string | null | undefined;
  onChange: (color: string) => void;
  className?: string;
}

const FestaColorPicker: React.FC<FestaColorPickerProps> = React.memo(
  ({ value, onChange, className }) => {
    const handleChange = useCallback(
      (color: string) => {
        onChange(color);
      },
      [onChange]
    );

    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        {FESTA_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            title={color.name}
            onClick={() => handleChange(color.value)}
            className={cn(
              "w-8 h-8 rounded-full border-2 transition-all duration-150 hover:scale-110",
              value === color.value
                ? "border-text-primary ring-2 ring-primary-300 scale-110"
                : "border-transparent hover:border-border"
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>
    );
  }
);

FestaColorPicker.displayName = "FestaColorPicker";

export { FestaColorPicker };

/** Small color dot for displaying festa color in lists/tables */
interface FestaColorDotProps {
  color: string | null | undefined;
  className?: string;
}

const FestaColorDot: React.FC<FestaColorDotProps> = React.memo(
  ({ color, className }) => {
    if (!color) return null;
    return (
      <span
        className={cn(
          "inline-block w-3 h-3 rounded-full shrink-0",
          className
        )}
        style={{ backgroundColor: color }}
      />
    );
  }
);

FestaColorDot.displayName = "FestaColorDot";

export { FestaColorDot };