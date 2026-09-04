"use client";

import { Minus, Plus } from "lucide-react";
import { formatEuro } from "@/lib/format";
import type { Extra } from "@/lib/api/extras";

interface ExtrasQuantidadeStepperProps {
  extra: Extra;
  quantidade: number;
  numPessoas: number;
  onChange: (qtd: number) => void;
}

export default function ExtrasQuantidadeStepper({
  extra,
  quantidade,
  numPessoas,
  onChange,
}: ExtrasQuantidadeStepperProps) {
  const porPessoa = extra.baseCobranca === "POR_PESSOA";
  const qtdEfetiva = porPessoa ? Math.max(1, numPessoas) : quantidade;
  const subtotal = Number(extra.precoUnitario) * qtdEfetiva;

  return (
    <div className="flex items-center gap-2 text-xs pl-1">
      {!porPessoa && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange(Math.max(1, quantidade - 1))}
            disabled={quantidade <= 1}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-text-secondary hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Diminuir quantidade"
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center font-medium text-text-primary tabular-nums">{quantidade}</span>
          <button
            type="button"
            onClick={() => onChange(quantidade + 1)}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-border text-text-secondary hover:bg-gray-50"
            aria-label="Aumentar quantidade"
          >
            <Plus size={12} />
          </button>
        </div>
      )}
      <span className="text-text-muted">
        {porPessoa
          ? `${formatEuro(Number(extra.precoUnitario))} × ${qtdEfetiva} ${qtdEfetiva === 1 ? "pessoa" : "pessoas"}`
          : `${formatEuro(Number(extra.precoUnitario))} × ${quantidade}`}
      </span>
      <span className="font-semibold text-text-primary tabular-nums">{formatEuro(subtotal)}</span>
    </div>
  );
}
