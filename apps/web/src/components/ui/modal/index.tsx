"use client";

import React, { useRef, useEffect } from "react";
import { Portal } from "@radix-ui/react-portal";

type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export type { ModalSize };

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: ModalSize;
  title?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md w-full mx-4",
  md: "max-w-2xl w-full mx-4",
  lg: "max-w-4xl w-full mx-4",
  xl: "max-w-6xl w-full mx-4",
  "2xl": "max-w-[1400px] w-[95vw] mx-auto",
  full: "max-w-full w-full h-full mx-0 rounded-none",
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  size = "md",
  title,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = size === "full"
    ? `${sizeClasses[size]} h-full`
    : `${sizeClasses[size]} relative rounded-[20px] bg-surface mx-auto my-4`;

  return (
    <Portal>
      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999">
        {size !== "full" && (
          <div
            className="fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]"
            onClick={onClose}
          />
        )}
        <div
          ref={modalRef}
          className={`${contentClasses} ${className || ""}`}
          style={size !== "full" ? { boxShadow: "var(--shadow-modal)" } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-[1000] flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
              aria-label="Fechar"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
          {title && (
            <div className={showCloseButton ? "px-6 pt-14 sm:px-8 sm:pt-16" : "px-6 pt-6 sm:px-8 sm:pt-8"}>
              <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
            </div>
          )}
          <div className={showCloseButton && !title ? "pt-14 sm:pt-16" : ""}>{children}</div>
        </div>
      </div>
    </Portal>
  );
};
