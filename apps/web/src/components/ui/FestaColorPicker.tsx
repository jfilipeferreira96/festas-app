"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";

// Paleta de cores da marca BasyLandy
export const FESTA_COLORS = [
  // ── Cores originais (preservadas) ──
  { name: "Azul", value: "#0095C8" },
  { name: "Verde", value: "#5CBE4A" },
  { name: "Amarelo", value: "#FCE12D" },
  { name: "Laranja", value: "#F59253" },
  { name: "Rosa", value: "#E54796" },
  { name: "Verde-água", value: "#00A68A" },
  { name: "Roxo", value: "#993B98" },
  { name: "Cinzento", value: "#8A8E91" },
  // ── Cores adicionais ──
  { name: "Azul-marinho", value: "#1E40AF" },
  { name: "Vermelho", value: "#DC2626" },
  { name: "Rosa-claro", value: "#FF69B4" },
  { name: "Violeta", value: "#8B5CF6" },
  { name: "Âmbar", value: "#F59E0B" },
  { name: "Ciano", value: "#06B6D4" },
  { name: "Castanho", value: "#7C2D12" },
  { name: "Preto", value: "#000000" },
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