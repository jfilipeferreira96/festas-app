import type { ReactNode } from "react";

interface FieldLabelProps {
  children: ReactNode;
  required?: boolean;
  className?: string;
}

export default function FieldLabel({ children, required, className = "" }: FieldLabelProps) {
  return (
    <label className={`block text-xs font-medium text-text-secondary mb-1 ${className}`}>
      {children}
      {required && <span className="text-error-500 font-semibold"> *</span>}
    </label>
  );
}
