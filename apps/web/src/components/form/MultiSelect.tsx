import React, { useState, useEffect, useRef, useCallback } from "react";

interface Option {
  value: string;
  text: string;
  selected: boolean;
}

interface MultiSelectProps {
  label: string;
  options: Option[];
  defaultSelected?: string[];
  onChange?: (selected: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({
  label,
  options,
  defaultSelected = [],
  onChange,
  disabled = false,
  placeholder = "Selecionar...",
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(defaultSelected);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with external defaultSelected changes
  useEffect(() => {
    setSelectedOptions(defaultSelected);
  }, [defaultSelected.join(",")]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      const newSelectedOptions = selectedOptions.includes(optionValue)
        ? selectedOptions.filter((value) => value !== optionValue)
        : [...selectedOptions, optionValue];

      setSelectedOptions(newSelectedOptions);
      if (onChange) onChange(newSelectedOptions);
    },
    [selectedOptions, onChange]
  );

  const removeOption = useCallback(
    (value: string) => {
      const newSelectedOptions = selectedOptions.filter((opt) => opt !== value);
      setSelectedOptions(newSelectedOptions);
      if (onChange) onChange(newSelectedOptions);
    },
    [selectedOptions, onChange]
  );

  const selectedValuesText = selectedOptions.map(
    (value) => options.find((option) => option.value === value)?.text || ""
  );

  return (
    <div className="w-full" ref={containerRef}>
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        {label}
      </label>

      <div className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={toggleDropdown}
          disabled={disabled}
          className="flex h-11 w-full items-center justify-between rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm shadow-theme-xs transition focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
            {selectedValuesText.length > 0 ? (
              selectedValuesText.map((text, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                >
                  {text}
                  <svg
                    onClick={(e) => {
                      e.stopPropagation();
                      removeOption(selectedOptions[index]);
                    }}
                    className="fill-current cursor-pointer hover:text-primary-900 dark:hover:text-primary-300"
                    width="12"
                    height="12"
                    viewBox="0 0 14 14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M3.40717 4.46881C3.11428 4.17591 3.11428 3.70104 3.40717 3.40815C3.70006 3.11525 4.17494 3.11525 4.46783 3.40815L6.99943 5.93975L9.53095 3.40822C9.82385 3.11533 10.2987 3.11533 10.5916 3.40822C10.8845 3.70112 10.8845 4.17599 10.5916 4.46888L8.06009 7.00041L10.5916 9.53193C10.8845 9.82482 10.8845 10.2997 10.5916 10.5926C10.2987 10.8855 9.82385 10.8855 9.53095 10.5926L6.99943 8.06107L4.46783 10.5927C4.17494 10.8856 3.70006 10.8856 3.40717 10.5927C3.11428 10.2998 3.11428 9.8249 3.40717 9.53201L5.93877 7.00041L3.40717 4.46881Z"
                    />
                  </svg>
                </span>
              ))
            ) : (
              <span className="text-text-muted">{placeholder}</span>
            )}
          </div>
          <svg
            className={`ml-2 h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.79175 7.39551L10.0001 12.6038L15.2084 7.39551"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute left-0 z-50 mt-1 w-full overflow-y-auto rounded-lg border border-border bg-surface shadow-lg dark:bg-gray-900 max-h-48">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-text-muted">Sem opções</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition hover:bg-primary-50 dark:hover:bg-primary-900/20 ${
                    selectedOptions.includes(option.value)
                      ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                      : "text-text-primary"
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selectedOptions.includes(option.value)
                        ? "border-primary-500 bg-primary-500 text-white"
                        : "border-border"
                    }`}
                  >
                    {selectedOptions.includes(option.value) && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span>{option.text}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelect;
