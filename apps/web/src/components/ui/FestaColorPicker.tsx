"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";

const FESTA_COLORS = [
  { name: "Vermelho", value: "#EF4444" },
  { name: "Laranja", value: "#F97316" },
  { name: "Amarelo", value: "#EAB308" },
  { name: "Verde", value: "#22C55E" },
  { name: "Azul", value: "#3B82F6" },
  { name: "Roxo", value: "#A855F7" },
  { name: "Rosa", value: "#EC4899" },
  { name: "Turquesa", value: "#14B8A6" },
  { name: "Índigo", value: "#6366F1" },
  { name: "Coral", value: "#FB7185" },
  { name: "Lima", value: "#84CC16" },
  { name: "Ciano", value: "#06B6D4" },
];

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

export { FestaColorPicker, FESTA_COLORS };

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