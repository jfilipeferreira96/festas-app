"use client";

import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  id: string;
  label: string;
  checked: boolean;
}

interface FilterDropdownProps {
  /** Whether the dropdown is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Toggle option handler */
  onToggleOption: (id: string) => void;
  /** Apply handler */
  onApply: () => void;
  /** Filter options (team members) */
  options: FilterOption[];
  /** Label for the filter section */
  label?: string;
  /** Placeholder text when searching options */
  searchPlaceholder?: string;
  /** Apply button text */
  applyText?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FilterDropdown({
  isOpen,
  onClose,
  onToggleOption,
  onApply,
  options,
  label,
  searchPlaceholder,
  applyText,
}: FilterDropdownProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      {/* Filter label */}
      {label && (
        <label className="mb-3 block text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Options list */}
      <div className="max-h-64 overflow-y-auto space-y-2">
        {options.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-2 text-center">
            {t("common.noOptionsAvailable", { defaultValue: "No options available" })}
          </p>
        ) : (
          options.map((option) => (
            <label
              key={option.id}
              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
            >
              <input
                type="checkbox"
                checked={option.checked}
                onChange={() => onToggleOption(option.id)}
                className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {option.label}
              </span>
            </label>
          ))
        )}
      </div>

      {/* Apply button */}
      <button
        onClick={onApply}
        className="mt-4 bg-brand-600 hover:bg-brand-700 h-10 w-full rounded-lg px-3 py-2 text-sm font-medium text-white dark:bg-brand-500 dark:hover:bg-brand-600"
      >
        {applyText || t("common.apply", { defaultValue: "Apply" })}
      </button>
    </div>
  );
}