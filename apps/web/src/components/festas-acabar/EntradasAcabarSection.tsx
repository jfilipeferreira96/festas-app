"use client";

import React from "react";
import { Users, AlertTriangle, CheckCircle, CreditCard, Clock, Sandwich } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Select } from "@/components/ui/select";
import { useAtualizarLancheEntradaAcabar } from "@/hooks/use-festas-acabar";
import type { EntradaAcabar } from "@/lib/api/festasAcabar";
import type { EstadoLanche } from "@saas/shared-types";

const ESTADO_LANCHE_OPTIONS = [
  { value: "NAO_INICIADO", label: "Não iniciado" },
  { value: "A_DECORRER", label: "A decorrer" },
  { value: "TERMINADO", label: "Terminado" },
];

function formatHora(iso: string): string {
  try {
    return format(parseISO(iso), "HH:mm");
  } catch {
    return "-";
  }
}

/**
 * Secção "Entradas Livres" da página Festas a Acabar (balcão).
 * Alertas vermelhos: não paga ou tempo excedido.
 * Confirmação do lanche por card (dropdown estadoLanche).
 * Sem acções de gestão (concluir/pagar ficam no admin).
 */
const EntradasAcabarSection = React.memo(function EntradasAcabarSection({
  entradas,
  now,
}: {
  entradas: EntradaAcabar[];
  now: number;
}) {
  const atualizarLanche = useAtualizarLancheEntradaAcabar();

  if (entradas.length === 0) {
    return (
      <div className="rounded-xl p-8 border border-border text-center bg-white">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-50 mx-auto mb-3">
          <Users size={24} className="text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">Sem entradas livres ativas</p>
        <p className="text-xs text-text-muted">Não existem entradas livres em curso neste momento.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {entradas.map((entrada) => {
        const excedida = now > parseISO(entrada.fimPrevisto).getTime();
        const emAlerta = !entrada.pago || excedida;

        return (
          <div
            key={entrada.id}
            className={`rounded-xl border shadow-theme-xs bg-white p-4 ${
              emAlerta ? "border-accent-red-300 ring-1 ring-accent-red-200" : "border-border"
            }`}
          >
            {/* Cabeçalho: crianças + estado pagamento */}
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-text-muted shrink-0" />
                  <span className="text-sm font-semibold text-text-primary truncate" title={entrada.criancasNomes}>
                    {entrada.criancasNomes}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span>{entrada.numCriancas} {entrada.numCriancas === 1 ? "criança" : "crianças"}</span>
                  <span>·</span>
                  <span>{entrada.encarregadoNome}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <Clock size={11} />
                  <span>
                    {formatHora(entrada.inicioEm)} → {formatHora(entrada.fimPrevisto)}
                  </span>
                </div>
              </div>
              {entrada.pago ? (
                <span className="flex items-center gap-1 text-xs font-medium text-accent-green-600 shrink-0">
                  <CheckCircle size={13} /> Pago
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-accent-red-600 shrink-0">
                  <CreditCard size={13} /> Por pagar
                </span>
              )}
            </div>

            {/* Alertas do balcão */}
            {emAlerta && (
              <div className="space-y-1.5 mt-2 mb-2">
                {!entrada.pago && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-red-50 border border-accent-red-200">
                    <AlertTriangle size={13} className="text-accent-red-500 shrink-0" />
                    <span className="text-xs font-medium text-accent-red-700">Entrada não paga</span>
                  </div>
                )}
                {excedida && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-red-50 border border-accent-red-200">
                    <AlertTriangle size={13} className="text-accent-red-500 shrink-0" />
                    <span className="text-xs font-medium text-accent-red-700">Tempo excedido</span>
                  </div>
                )}
              </div>
            )}

            {/* Observações / lesões */}
            {(entrada.observacoes?.trim() || entrada.observacoesLesoes?.trim()) && (
              <div className="space-y-1.5 mt-2 mb-2">
                {entrada.observacoes?.trim() && (
                  <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-accent-orange-50 border border-accent-orange-200">
                    <AlertTriangle size={13} className="text-accent-orange-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">{entrada.observacoes}</p>
                  </div>
                )}
                {entrada.observacoesLesoes?.trim() && (
                  <div className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-accent-red-50 border border-accent-red-200">
                    <AlertTriangle size={13} className="text-accent-red-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">
                      <span className="font-medium">Lesões/Alergias:</span> {entrada.observacoesLesoes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Confirmação do lanche */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                <Sandwich size={13} className="text-accent-orange-500" />
                Lanche
              </span>
              {entrada.temLanche ? (
                <Select
                  value={entrada.estadoLanche}
                  options={ESTADO_LANCHE_OPTIONS}
                  onChange={(opt) => atualizarLanche.mutate({ entradaLivreId: entrada.id, estadoLanche: opt as EstadoLanche })}
                  className="w-36 text-xs"
                  disabled={atualizarLanche.isPending}
                />
              ) : (
                <span className="text-xs text-text-muted">sem lanche</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

export default EntradasAcabarSection;
