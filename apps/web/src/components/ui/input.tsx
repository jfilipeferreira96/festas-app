import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  success?: boolean;
  hint?: string;
  lightFocus?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ autoComplete = "off", className = "", error = false, success = false, hint, lightFocus = false, ...props }, ref) => {
    let inputClasses = "h-11 w-full rounded-[10px] border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-2";

    if (error) {
      inputClasses += " border-accent-red-400 focus:border-accent-red-300 focus:ring-accent-red-400/20";
    } else if (success) {
      inputClasses += " border-accent-green-400 focus:border-accent-green-300 focus:ring-accent-green-400/20";
    } else {
      if (lightFocus) {
        inputClasses += " bg-transparent text-text-primary border-border focus:border-brand-300 focus:ring-brand-500/20";
      } else {
        inputClasses += " bg-transparent text-text-primary border-border focus:ring-2 focus:ring-brand-500 focus:border-transparent";
      }
    }

    if (props.disabled) {
      inputClasses += " text-gray-500 border-border opacity-40 bg-gray-100 cursor-not-allowed";
    }

    return (
      <div className="relative">
        <input
          ref={ref}
          autoComplete={autoComplete}
          className={`${inputClasses} ${className}`}
          {...props}
        />
        {hint && (
          <p
            className={`mt-1.5 text-xs ${
              error
                ? "text-accent-red-500"
                : success
                ? "text-accent-green-500"
                : "text-text-muted"
            }`}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
