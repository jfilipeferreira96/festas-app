"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterOption {
  id: string;
  label: string;
  checked: boolean;
}

interface FilterDropdownWithPortalProps {
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
  /** Trigger button ref for positioning */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FilterDropdownWithPortal({
  isOpen,
  onClose,
  onToggleOption,
  onApply,
  options,
  label,
  searchPlaceholder,
  applyText,
  triggerRef,
}: FilterDropdownWithPortalProps) {
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Mount state to ensure portal is available on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate dropdown position
  const updatePosition = useMemo(() => {
    return () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 288; // w-72 = 18rem = 288px

        // Position dropdown to the right of the button
        let left = rect.right - dropdownWidth;
        
        // If not enough space on the right, align to the left
        if (left < 10) {
          left = rect.left;
        }

        // If still not enough space, clamp to window
        if (left < 10) left = 10;
        if (left + dropdownWidth > window.innerWidth - 10) {
          left = window.innerWidth - dropdownWidth - 10;
        }

        setPosition({
          top: rect.bottom + 8, // 8px = 0.5rem = mt-2
          left,
        });
      }
    };
  }, [triggerRef]);

  // Update position when dropdown opens or window resizes/scrolls
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      
      // Recalculate on scroll and resize
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

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

  if (!isOpen || !mounted) return null;

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
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

  // Render portal to document.body
  if (typeof document !== "undefined" && document.body) {
    return createPortal(dropdownContent, document.body);
  }

  return null;
}