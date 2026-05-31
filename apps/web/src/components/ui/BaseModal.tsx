"use client";

import React from "react";
import { Portal } from "@radix-ui/react-portal";
import { Modal } from "./modal";

import type { ModalSize } from "./modal";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: ModalSize;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  size = "md",
}) => {
  if (!isOpen) return null;

  return (
    <Portal>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        className={className}
        showCloseButton={showCloseButton}
        size={size}
      >
        {children}
      </Modal>
    </Portal>
  );
};

export default BaseModal;
