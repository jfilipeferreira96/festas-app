"use client";

import React, { useState } from "react";
import { Modal, type ModalSize } from "@/components/ui/modal";

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: unknown) => Promise<void>;
  title: string;
  size?: ModalSize;
  children: React.ReactNode;
}

export function CreateModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  size = "md",
  children,
}: CreateModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: unknown) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      console.error("Erro ao criar:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={size}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{title}</h2>
        {children}
      </div>
    </Modal>
  );
}
