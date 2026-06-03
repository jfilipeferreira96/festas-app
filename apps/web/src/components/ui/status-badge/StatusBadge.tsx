"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
  {
    variants: {
      status: {
        // Reserva states
        RESERVA: "bg-gray-100 text-gray-600",
        CONFIRMADO: "bg-primary-50 text-primary-500",
        EM_CURSO: "bg-accent-green-50 text-accent-green-600",
        CONCLUIDA: "bg-accent-purple-50 text-accent-purple-500",
        CANCELADA: "bg-accent-red-50 text-accent-red-600",
        // Cacifo states
        LIVRE: "bg-accent-green-50 text-accent-green-600",
        OCUPADO: "bg-accent-red-50 text-accent-red-600",
        RESERVADO: "bg-primary-50 text-primary-500",
        PAGO: "bg-accent-purple-50 text-accent-purple-500",
        // General states
        ACTIVO: "bg-accent-green-50 text-accent-green-600",
        INACTIVO: "bg-gray-100 text-gray-500",
        // Alert states
        A_COMECAR: "bg-accent-orange-50 text-accent-orange-600",
        INSUFICIENTE: "bg-accent-red-50 text-accent-red-600",
        // Entrada Livre states
        ATIVA: "bg-accent-orange-50 text-accent-orange-600",
      },
    },
    defaultVariants: {
      status: "ACTIVO",
    },
  }
);

export type StatusType =
  | "RESERVA"
  | "CONFIRMADO"
  | "EM_CURSO"
  | "CONCLUIDA"
  | "CANCELADA"
  | "LIVRE"
  | "OCUPADO"
  | "RESERVADO"
  | "PAGO"
  | "ACTIVO"
  | "INACTIVO"
  | "A_COMECAR"
  | "INSUFICIENTE"
  | "ATIVA";

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: StatusType;
  children?: React.ReactNode;
}

const statusLabels: Record<StatusType, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
  LIVRE: "Livre",
  OCUPADO: "Ocupado",
  RESERVADO: "Reservado",
  PAGO: "Pago",
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  A_COMECAR: "A começar",
  INSUFICIENTE: "Insuficiente",
  ATIVA: "Ativa",
};

export function StatusBadge({ status, className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {children || statusLabels[status]}
    </span>
  );
}
