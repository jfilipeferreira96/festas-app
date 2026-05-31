import React from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ className = "", label, ...props }) => {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 rounded border-border text-brand-500 focus:ring-brand-500 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
      {label && (
        <span className="text-sm text-text-primary">{label}</span>
      )}
    </label>
  );
};

export default Checkbox;
