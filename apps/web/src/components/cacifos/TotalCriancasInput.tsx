"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { useUpdateReserva } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";

interface TotalCriancasInputProps {
  reservaId: string;
  numCriancas: number | null;
  /** Nº de cacifos da festa, para o alerta comparativo. */
  cacifosCount: number;
  /** Variante compacta (chips da página cacifos): sem linha comparativa. */
  compact?: boolean;
}

/** Input "Total de Crianças" (numCriancas) - o campo que cobra. Editável
 *  pela equipa de cacifos (modal/chips) e pela receção (detalhe/FestaForm).
 *  O alerta compara com o nº de cacifos da festa; nunca bloqueia. */
export default function TotalCriancasInput({
  reservaId,
  numCriancas,
  cacifosCount,
  compact = false,
}: TotalCriancasInputProps) {
  const toast = useToast();
  const updateReserva = useUpdateReserva();
  const valorGuardado = numCriancas != null ? String(numCriancas) : "";
  const [valor, setValor] = useState(valorGuardado);

  useEffect(() => {
    setValor(valorGuardado);
  }, [valorGuardado]);

  const sujo = valor !== valorGuardado;
  const valorEfetivo = sujo ? Math.max(0, Math.round(Number(valor) || 0)) : numCriancas ?? 0;
  const difere = valorEfetivo !== cacifosCount;

  const guardar = async () => {
    const n = Math.max(0, Math.round(Number(valor) || 0));
    try {
      await updateReserva.mutateAsync({ id: reservaId, data: { numCriancas: n } });
      toast.success("Total de crianças atualizado.");
    } catch (err) {
      toast.handleApiError(err, "Não foi possível guardar o total de crianças.");
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()} title="Total de crianças">
        <input
          type="number"
          min={0}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="·"
          className={`w-14 h-7 px-1.5 rounded-md border text-xs text-center focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            sujo
              ? "border-brand-400 bg-brand-50 text-brand-700"
              : "border-border bg-gray-50 text-text-secondary"
          }`}
        />
        {sujo && (
          <button
            type="button"
            onClick={guardar}
            disabled={updateReserva.isPending}
            className="px-1.5 py-0.5 rounded bg-brand-500 text-white text-[10px] font-semibold hover:bg-brand-600 disabled:opacity-50"
          >
            ✓
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs font-medium text-text-muted shrink-0">Total de Crianças:</span>
      <input
        type="number"
        min={0}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="0"
        className="w-20 h-8 px-2 rounded-lg border border-border bg-transparent text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {sujo && (
        <button
          type="button"
          onClick={guardar}
          disabled={updateReserva.isPending}
          className="px-2.5 py-1 rounded-lg bg-brand-500 text-white text-xs font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {updateReserva.isPending ? "A guardar..." : "Guardar"}
        </button>
      )}
      {difere ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent-orange-600">
          <AlertTriangle size={12} className="shrink-0" />
          {cacifosCount} {cacifosCount === 1 ? "cacifo atribuído" : "cacifos atribuídos"} vs.{" "}
          {valorEfetivo} {valorEfetivo === 1 ? "criança" : "crianças"}
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-accent-green-600">
          <CheckCircle2 size={12} className="shrink-0" />
          Coincide com os {cacifosCount} {cacifosCount === 1 ? "cacifo" : "cacifos"}
        </p>
      )}
    </div>
  );
}
