import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

const Textarea: React.FC<TextareaProps> = ({ className = "", ...props }) => {
  return (
    <textarea
      className={`w-full px-3 py-2.5 border border-border rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm text-text-primary placeholder:text-text-muted resize-none ${className}`}
      {...props}
    />
  );
};

export default Textarea;
