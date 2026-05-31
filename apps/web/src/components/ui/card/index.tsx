import React, { ReactNode } from "react";

interface CardProps {
  children?: ReactNode;
  className?: string;
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`rounded-[14px] border border-border bg-surface p-5 sm:p-6 ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
};

const CardTitle: React.FC<CardTitleProps> = ({ children, className = "" }) => {
  return (
    <h4 className={`font-poppins mb-1 font-semibold text-text-primary text-theme-xl ${className}`}>
      {children}
    </h4>
  );
};

const CardDescription: React.FC<CardDescriptionProps> = ({ children, className = "" }) => {
  return <p className={`text-sm text-text-secondary ${className}`}>{children}</p>;
};

export { Card, CardTitle, CardDescription };
