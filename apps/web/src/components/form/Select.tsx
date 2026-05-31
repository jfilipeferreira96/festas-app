import { ChevronDownIcon } from "@/icons";
import React, { useState, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  value?: string;
  defaultValue?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = "Seleciona uma opção",
  onChange,
  className = "",
  value,
  defaultValue = "",
}) => {
  // Use controlled value if provided, otherwise use internal state
  const [internalValue, setInternalValue] = useState<string>(defaultValue);
  const selectedValue = value !== undefined ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange(newValue);
  };

  // Sync internal state when defaultValue changes (for uncontrolled mode)
  useEffect(() => {
    if (value === undefined && defaultValue !== internalValue) {
      setInternalValue(defaultValue);
    }
  }, [defaultValue, value, internalValue]);

  return (
    <div className="relative">
      <select
        className={`h-11 w-full appearance-none rounded-lg border border-border bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs transition focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-primary-300 ${
          selectedValue
            ? "text-text-primary"
            : "text-text-muted"
        } ${className}`}
        value={selectedValue}
        onChange={handleChange}
      >
        {/* Placeholder option */}
        <option
          value=""
          disabled
          className="text-text-secondary dark:bg-gray-900"
        >
          {placeholder}
        </option>
        {/* Map over options */}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-text-primary dark:bg-gray-900"
          >
            {option.label}
          </option>
        ))}
      </select>
      <span className="absolute text-text-muted -translate-y-1/2 pointer-events-none right-3 top-1/2">
        <ChevronDownIcon />
      </span>
    </div>
  );
};

export default Select;
