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

    // Garante um hex válido (#RRGGBB) para o input nativo de cor
    const safeColorForInput = React.useMemo(() => {
      const hex = value ?? "";
      return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#000000";
    }, [value]);

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex flex-wrap gap-2">
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

        {/* Selector de cor personalizado: colorpicker nativo + input de código hex */}
        <div className="flex items-center gap-2">
          <label
            className="relative w-8 h-8 rounded-full border-2 border-border cursor-pointer overflow-hidden shrink-0"
            title="Escolher cor personalizada"
            style={{ backgroundColor: value ?? "#ffffff" }}
          >
            <input
              type="color"
              value={safeColorForInput}
              onChange={(e) => handleChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Seleccionar cor personalizada"
            />
          </label>
          <input
            type="text"
            value={value ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              // Normaliza: adiciona # se o utilizador escrever sem
              const normalized = v.startsWith("#") ? v : `#${v}`;
              handleChange(normalized);
            }}
            placeholder="#0095C8"
            className="w-24 px-2 py-1 text-sm border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300 font-mono"
            aria-label="Código de cor (hex)"
          />
        </div>
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