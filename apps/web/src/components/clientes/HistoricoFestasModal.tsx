"use client";

import React from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Calendar, Users, MapPin, Euro } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useCliente } from "@/hooks/use-clientes";

interface HistoricoFestasModalProps {
  clienteId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const currencyFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});

// Cores por estado da reserva
const ESTADO_STYLE: Record<string, string> = {
  RESERVA: "bg-gray-100 text-gray-600",
  CONFIRMADO: "bg-blue-50 text-blue-600",
  EM_CURSO: "bg-amber-50 text-amber-600",
  CONCLUIDA: "bg-green-50 text-green-600",
  CANCELADA: "bg-red-50 text-red-600",
};

export default function HistoricoFestasModal({
  clienteId,
  isOpen,
  onClose,
}: HistoricoFestasModalProps) {
  // Só faz fetch quando o modal está aberto e há um cliente seleccionado
  const { data: cliente, isLoading } = useCliente(isOpen && clienteId ? clienteId : "");

  const festas = cliente?.reservas ?? [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title="Histórico de Festas">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {/* Cabeçalho do cliente */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary">
            {cliente?.nome ?? "Cliente"}
          </h3>
          <p className="text-xs text-text-muted">
            {festas.length} festa{festas.length === 1 ? "" : "s"} registada{festas.length === 1 ? "" : "s"}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : festas.length > 0 ? (
          <div className="space-y-2">
            {festas.map((festa) => {
              const dataFesta = new Date(festa.data);
              const valor = Number(festa.valorPago ?? 0);
              return (
                <div
                  key={festa.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg border border-border bg-surface hover:bg-gray-50/50 transition-colors"
                >
                  {/* Data */}
                  <div className="flex items-center gap-2 sm:w-40 shrink-0">
                    <Calendar size={16} className="text-text-muted" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {format(dataFesta, "dd 'de' MMM 'de' yyyy", { locale: pt })}
                      </p>
                      <p className="text-xs text-text-muted">{festa.horario}</p>
                    </div>
                  </div>

                  {/* Sala */}
                  <div className="flex items-center gap-1.5 sm:flex-1 min-w-0">
                    <MapPin size={14} className="text-text-muted shrink-0" />
                    <span className="text-sm text-text-secondary truncate">
                      {festa.local?.nome ?? "—"}
                    </span>
                  </div>

                  {/* Crianças */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Users size={14} className="text-text-muted" />
                    <span className="text-sm text-text-secondary">{festa.numCriancas}</span>
                  </div>

                  {/* Valor */}
                  <div className="flex items-center gap-1.5 shrink-0 sm:w-24 sm:justify-end">
                    {valor > 0 ? (
                      <>
                        <Euro size={14} className="text-text-muted" />
                        <span className="text-sm font-medium text-text-primary tabular-nums">
                          {currencyFmt.format(valor)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-text-muted">—</span>
                    )}
                  </div>

                  {/* Estado */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      ESTADO_STYLE[festa.estado] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {festa.estado}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar size={40} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">
              Este cliente ainda não tem festas registadas.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
