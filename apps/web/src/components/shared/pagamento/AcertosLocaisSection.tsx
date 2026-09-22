"use client";

import React, { useState } from "react";
import { ArrowUpDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import { formatEuro } from "@/lib/format";

export interface AcertoLocal {
  tipo: "ACRESCIMO" | "DESCONTO";
  valor: number;
  motivo: string;
  metodoPagamento?: string;
}

interface AcertosLocaisSectionProps {
  value: AcertoLocal[];
  onChange: (next: AcertoLocal[]) => void;
}

const fmt = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

/**
 * Editor de acertos na CRIAÇÃO (ainda sem ID na BD): o array segue no payload
 * e o backend grava-os logo após criar a festa/entrada, com write-through no
 * total acordado e auditoria (AjustePagamento.criadoPor). Puro/controlado.
 */
export default function AcertosLocaisSection({ value, onChange }: AcertosLocaisSectionProps) {
  const [tipo, setTipo] = useState<"ACRESCIMO" | "DESCONTO">("DESCONTO");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");

  const liquido = value.reduce((s, a) => (a.tipo === "ACRESCIMO" ? s + a.valor : s - a.valor), 0);
  const podeAdicionar = Number(valor) > 0 && !!motivo.trim();

  const adicionar = () => {
    const valorNum = Number(valor);
    if (!(valorNum > 0) || !motivo.trim()) return;
    onChange([...value, { tipo, valor: Math.round(valorNum * 100) / 100, motivo: motivo.trim() }]);
    setValor("");
    setMotivo("");
  };

  return (
    <div className="space-y-2.5">
      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((a, i) => (
            <li
              key={`${a.tipo}-${a.valor}-${i}`}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border border-border bg-surface"
            >
              <span className="inline-flex items-center gap-1.5 min-w-0 text-xs text-text-primary">
                <ArrowUpDown size={13} className="text-text-muted shrink-0" />
                <span className="truncate">
                  {a.tipo === "ACRESCIMO" ? "Acréscimo" : "Desconto"} · {a.motivo}
                </span>
              </span>
              <span className="inline-flex items-center gap-2 shrink-0">
                <span
                  className={`text-xs font-semibold ${
                    a.tipo === "ACRESCIMO" ? "text-accent-green-600" : "text-accent-orange-600"
                  }`}
                >
                  {a.tipo === "ACRESCIMO" ? "+" : "−"}
                  {fmt.format(a.valor)}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="p-1 text-text-muted hover:text-accent-red transition-colors"
                  title="Remover acerto"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-3">
        <div className="w-48 shrink-0">
          <Select
            options={[
              { value: "DESCONTO", label: "Desconto (−)" },
              { value: "ACRESCIMO", label: "Acréscimo (+)" },
            ]}
            value={tipo}
            onChange={(v) => setTipo(v as "ACRESCIMO" | "DESCONTO")}
          />
        </div>
        <div className="w-24">
          <InputField
            type="number"
            min={0}
            step={0.01}
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <InputField
            placeholder="Motivo (obrigatório)"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={adicionar}
          disabled={!podeAdicionar}
          className="shrink-0"
        >
          <Plus size={14} /> Adicionar
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>Líquido dos acertos</span>
          <span className="font-semibold">
            {liquido >= 0 ? "+" : "−"}
            {fmt.format(Math.abs(liquido))}
          </span>
        </div>
      )}
    </div>
  );
}
