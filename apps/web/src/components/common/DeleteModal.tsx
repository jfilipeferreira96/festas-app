"use client";

import React, { useState } from "react";
import { Modal, type ModalSize } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { AlertTriangle } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  message?: string;
  itemName?: string;
}

export function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar Eliminação",
  message = "Tem a certeza que deseja eliminar este item?",
  itemName,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Erro ao eliminar:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        
        <p className="text-sm text-text-secondary mb-2">{message}</p>
        {itemName && (
          <p className="text-sm font-medium text-text-primary mb-6">
            "{itemName}"
          </p>
        )}
        
        <div className="border-t border-border pt-4 mt-4 flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 rounded-[10px] px-5 py-3"
          >
            Cancelar
          </Button>
          <div className="flex gap-2 flex-1 justify-end">
            <Button
              variant="danger"
              onClick={handleConfirm}
              disabled={isDeleting}
              className="rounded-[10px] px-5 py-3"
            >
              {isDeleting ? "A eliminar..." : "Eliminar"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}