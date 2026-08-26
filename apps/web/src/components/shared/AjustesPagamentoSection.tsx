"use client";

import React, { useState, useCallback } from "react";
import { Plus, Minus, Trash2, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import { useAjustesPagamento, useCriarAjustePagamento, useEliminarAjustePagamento } from "@/hooks/use-ajustes-pagamento";
import { useToast } from "@/hooks/use-toast";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const TIPO_OPTIONS = [
  { value: "ACRESCIMO", label: "Acréscimo (+)" },
  { value: "DESCONTO", label: "Desconto (−)" },
];

const METODO_OPTIONS = [
  { value: "NONE", label: "Mesmo método" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "MULTIBANCO", label: "Multibanco" },
  { value: "MBWAY", label: "MB WAY" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CARTAO", label: "Cartão" },
  { value: "OUTRO", label: "Outro" },
];

interface AjustesPagamentoSectionProps {
  reservaId?: string;
  entradaLivreId?: string;
}

function AjustesPagamentoSection({ reservaId, entradaLivreId }: AjustesPagamentoSectionProps) {
  const toast = useToast();
  const { data: ajustes, isLoading } = useAjustesPagamento({ reservaId, entradaLivreId });
  const criarAjuste = useCriarAjustePagamento();
  const eliminarAjuste = useEliminarAjustePagamento();

  const [tipo, setTipo] = useState("ACRESCIMO");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState("NONE");

  const totalLiquido = (ajustes ?? []).reduce(
    (sum, a) => sum + (a.tipo === "ACRESCIMO" ? a.valor : -a.valor),
    0
  );

  const handleAdd = useCallback(async () => {
    const valorNum = parseFloat(valor);
    if (!valorNum || valorNum <= 0) {
      toast.error("Indique um valor maior que zero.");
      return;
    }
    if (!motivo.trim()) {
      toast.error("A nota do acerto é obrigatória.");
      return;
    }
    try {
      await criarAjuste.mutateAsync({
        tipo: tipo as "ACRESCIMO" | "DESCONTO",
        valor: valorNum,
        motivo: motivo.trim(),
        metodoPagamento: metodo === "NONE" ? undefined : metodo,
        reservaId,
        entradaLivreId,
      });
      setValor("");
      setMotivo("");
      setMetodo("NONE");
      toast.success("Acerto registado.");
    } catch (err) {
      toast.handleApiError(err, "Erro ao registar acerto.");
    }
  }, [criarAjuste, tipo, valor, motivo, metodo, reservaId, entradaLivreId, toast]);

  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await eliminarAjuste.mutateAsync(id);
        toast.success("Acerto removido e total revertido.");
      } catch (err) {
        toast.handleApiError(err, "Erro ao remover acerto.");
      }
    },
    [eliminarAjuste, toast]
  );

  return (
    <div className="border-t border-border pt-3 space-y-3">
      <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <ArrowUpDown size={14} className="text-text-muted" /> Acertos de Pagamento
      </label>

      {/* Lista de acertos */}
      {isLoading ? (
        <p className="text-xs text-text-muted">A carregar acertos...</p>
      ) : (ajustes ?? []).length === 0 ? (
        <p className="text-xs text-text-muted">Sem acertos registados.</p>
      ) : (
        <div className="space-y-1.5">
          {(ajustes ?? []).map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface border border-border"
            >
              {a.tipo === "ACRESCIMO" ? (
                <Plus size={14} className="text-accent-green-600 mt-0.5 shrink-0" />
              ) : (
                <Minus size={14} className="text-accent-red-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      a.tipo === "ACRESCIMO" ? "text-accent-green-600" : "text-accent-red-500"
                    }`}
                  >
                    {a.tipo === "ACRESCIMO" ? "+" : "−"} {fmtEuro.format(a.valor)}
                  </span>
                  {a.criadoPor && (
                    <span className="text-[10px] text-text-muted">
                      {a.criadoPor.name} ·{" "}
                      {new Date(a.createdAt).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">{a.motivo}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.id)}
                disabled={eliminarAjuste.isPending}
                className="p-1 text-text-muted hover:text-accent-red-500 transition-colors shrink-0"
                title="Remover acerto (reverte o total)"
                aria-label="Remover acerto"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <span className="text-xs font-medium text-text-secondary">Total de acertos</span>
            <span
              className={`text-xs font-bold ${
                totalLiquido >= 0 ? "text-accent-green-600" : "text-accent-red-500"
              }`}
            >
              {totalLiquido >= 0 ? "+" : "−"} {fmtEuro.format(Math.abs(totalLiquido))}
            </span>
          </div>
        </div>
      )}

      {/* Form novo acerto */}
      <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Tipo</label>
            <Select options={TIPO_OPTIONS} value={tipo} onChange={setTipo} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Valor (€)</label>
            <InputField
              type="number"
              step={0.01}
              min={0.01}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-secondary mb-1">Nota *</label>
          <InputField
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: lanche só para 1 criança, desconto comercial..."
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Método</label>
            <Select options={METODO_OPTIONS} value={metodo} onChange={setMetodo} />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            disabled={criarAjuste.isPending}
            className="shrink-0"
          >
            {criarAjuste.isPending ? "A guardar..." : "Acertar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AjustesPagamentoSection);
