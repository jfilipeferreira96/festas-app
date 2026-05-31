"use client";
import { cn } from "@/utils";
import type React from "react";
import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";

interface DropdownProps
{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** Use portal rendering to escape stacking contexts (e.g., overflow containers) */
  usePortal?: boolean;
  /** Trigger button ref for positioning when using portal */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  usePortal = false,
  triggerRef,
}) =>
{
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  // Mount state to ensure portal is available on client
  useEffect(() =>
  {
    setMounted(true);
  }, []);

  // Calculate dropdown position when using portal
  const updatePosition = useMemo(() =>
  {
    return () =>
    {
      if (triggerRef?.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const dropdownWidth = 192; // w-48 = 12rem = 192px

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
          top: rect.bottom + 4, // 4px = mt-1
          left,
        });
      }
    };
  }, [triggerRef]);

  // Update position when dropdown opens or window resizes/scrolls (portal only)
  useEffect(() =>
  {
    if (usePortal && isOpen) {
      updatePosition();
      
      // Recalculate on scroll and resize
      const handleScroll = () => updatePosition();
      const handleResize = () => updatePosition();

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () =>
      {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [usePortal, isOpen, updatePosition]);

  // Close on click outside
  useEffect(() =>
  {
    const handleClickOutside = (event: MouseEvent) =>
    {
      const target = event.target as HTMLElement;
      const isClickInsideDropdown = dropdownRef.current?.contains(target);
      const isClickOnTrigger = triggerRef?.current?.contains(target);
      const isClickOnToggle = target.closest(".dropdown-toggle");

      if (!isClickInsideDropdown && !isClickOnTrigger && !isClickOnToggle) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () =>
    {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  // Close on Escape
  useEffect(() =>
  {
    const handleKeyDown = (e: KeyboardEvent) =>
    {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () =>
    {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || (usePortal && !mounted)) return null;

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={cn(
        usePortal
          ? "fixed z-[9999] w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          : "absolute z-40 right-0 mt-2 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark",
        className
      )}
      style={
        usePortal
          ? {
              top: `${position.top}px`,
              left: `${position.left}px`,
            }
          : undefined
      }
    >
      {children}
    </div>
  );

  // Render portal to document.body when usePortal is true
  if (usePortal && typeof document !== "undefined" && document.body) {
    return createPortal(dropdownContent, document.body);
  }

  return dropdownContent;
};