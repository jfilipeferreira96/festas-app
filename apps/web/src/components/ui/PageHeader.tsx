import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  if (actions) {
    return (
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4${className ? ` ${className}` : ""}`}>
        <div>
          <h1 className="font-poppins text-2xl font-bold text-text-primary tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-text-secondary">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">{actions}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <h1 className="font-poppins text-2xl font-bold text-text-primary tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-text-secondary">
          {subtitle}
        </p>
      )}
    </div>
  );
}
