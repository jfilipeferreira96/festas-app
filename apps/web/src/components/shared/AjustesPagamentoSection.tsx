"use client";

import React, { useState, useCallback } from "react";
import { Plus, Minus, Trash2, ArrowUpDown, PenLine, CornerUpRight } from "lucide-react";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import {
  useAjustesPagamento,
  useCriarAjustePagamento,
  useRedefinirPreco,
  useEliminarAjustePagamento,
} from "@/hooks/use-ajustes-pagamento";
import { useToast } from "@/hooks/use-toast";
import type { AjustePagamento } from "@/lib/api/ajustes-pagamento";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const TIPO_OPTIONS = [
  { value: "ACRESCIMO", label: "Acréscimo (+)" },
  { value: "DESCONTO", label: "Desconto (−)" },
];

const MODO_OPTIONS = [
  { value: "TOTAL", label: "Total (€)" },
  { value: "POR_CRIANCA", label: "Por criança (€)" },
];

import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";

/** "Mesmo método" (NONE) + métodos canónicos da fonte única. */
const METODO_OPTIONS = [
  { value: "NONE", label: "Mesmo método" },
  ...METODO_PAGAMENTO_OPTIONS.filter((o) => o.value !== "NONE"),
];

interface AjustesPagamentoSectionProps {
  reservaId?: string;
  entradaLivreId?: string;
  /** Nº de crianças (confirmadas ?? previstas) - usado no preview do preço por criança */
  numCriancas?: number | null;
  /** Notifica o pai do delta (±) aplicado write-through ao total pelo backend */
  onAjusteAplicado?: (delta: number) => void;
  /** Notifica o pai do novo total absoluto (redefinição de preço) */
  onTotalRedefinido?: (novoTotal: number) => void;
}

function AjustesPagamentoSection({
  reservaId,
  entradaLivreId,
  numCriancas,
  onAjusteAplicado,
  onTotalRedefinido,
}: AjustesPagamentoSectionProps) {
  const toast = useToast();
  const { data: ajustes, isLoading } = useAjustesPagamento({ reservaId, entradaLivreId });
  const criarAjuste = useCriarAjustePagamento();
  const redefinirPreco = useRedefinirPreco();
  const eliminarAjuste = useEliminarAjustePagamento();

  const [tipo, setTipo] = useState("ACRESCIMO");
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [metodo, setMetodo] = useState("NONE");
  // Form "novo acerto" colapsado por defeito (revelação progressiva)
  const [showNovo, setShowNovo] = useState(false);

  // ── Redefinir preço ──
  const [showRedefinir, setShowRedefinir] = useState(false);
  const [redefModo, setRedefModo] = useState("TOTAL");
  const [redefValor, setRedefValor] = useState("");
  const [redefPorCabeca, setRedefPorCabeca] = useState("");
  const [redefMotivo, setRedefMotivo] = useState("");

  // REDEFINICAO não conta no líquido (define total absoluto, não é ±)
  const totalLiquido = (ajustes ?? []).reduce(
    (sum, a) =>
      a.tipo === "REDEFINICAO" ? sum : a.tipo === "ACRESCIMO" ? sum + Number(a.valor) : sum - Number(a.valor),
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
      // O backend aplica write-through ao total - sincronizar o estado do pai
      onAjusteAplicado?.(tipo === "ACRESCIMO" ? valorNum : -valorNum);
      setValor("");
      setMotivo("");
      setMetodo("NONE");
      setShowNovo(false);
      toast.success("Acerto registado.");
    } catch (err) {
      toast.handleApiError(err, "Erro ao registar acerto.");
    }
  }, [criarAjuste, tipo, valor, motivo, metodo, reservaId, entradaLivreId, onAjusteAplicado, toast]);

  const handleRedefinir = useCallback(async () => {
    if (!redefMotivo.trim()) {
      toast.error("A nota da redefinição é obrigatória.");
      return;
    }
    const modo = redefModo as "TOTAL" | "POR_CRIANCA";
    let criado: AjustePagamento;
    if (modo === "TOTAL") {
      const total = parseFloat(redefValor);
      if (!total || total <= 0) {
        toast.error("Indique o novo total (maior que zero).");
        return;
      }
      criado = await redefinirPreco.mutateAsync(
        { modo: "TOTAL", valor: total, motivo: redefMotivo.trim(), reservaId, entradaLivreId },
        { onSuccess: () => toast.success("Preço redefinido.") }
      );
    } else {
      const porCabeca = parseFloat(redefPorCabeca);
      if (!porCabeca || porCabeca <= 0) {
        toast.error("Indique o preço por criança (maior que zero).");
        return;
      }
      criado = await redefinirPreco.mutateAsync(
        { modo: "POR_CRIANCA", precoPorCabeca: porCabeca, motivo: redefMotivo.trim(), reservaId, entradaLivreId },
        { onSuccess: () => toast.success("Preço redefinido.") }
      );
    }
    // O ajuste REDEFINICAO devolve o novo total absoluto - sincronizar o pai
    onTotalRedefinido?.(Number(criado.valor));
    setRedefValor("");
    setRedefPorCabeca("");
    setRedefMotivo("");
    setShowRedefinir(false);
  }, [redefinirPreco, redefModo, redefValor, redefPorCabeca, redefMotivo, reservaId, entradaLivreId, onTotalRedefinido, toast]);

  const handleRemove = useCallback(
    async (id: string) => {
      // Delta inverso do acerto removido (o backend já reverteu na BD)
      const alvo = (ajustes ?? []).find((a) => a.id === id);
      try {
        await eliminarAjuste.mutateAsync(id);
        if (alvo) {
          onAjusteAplicado?.(alvo.tipo === "ACRESCIMO" ? -Number(alvo.valor) : Number(alvo.valor));
        }
        toast.success("Acerto removido e total revertido.");
      } catch (err) {
        toast.handleApiError(err, "Erro ao remover acerto.");
      }
    },
    [ajustes, eliminarAjuste, onAjusteAplicado, toast]
  );

  // Preview do total em modo POR_CRIANCA
  const previewTotal =
    redefModo === "POR_CRIANCA" && numCriancas && numCriancas > 0 && parseFloat(redefPorCabeca) > 0
      ? fmtEuro.format(parseFloat(redefPorCabeca) * numCriancas)
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <ArrowUpDown size={14} className="text-text-muted" /> Acertos de Pagamento
        </label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowNovo((v) => !v)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
              showNovo
                ? "bg-brand-100 text-brand-700"
                : "text-text-muted hover:bg-gray-100 hover:text-text-primary"
            }`}
          >
            <Plus size={12} /> Novo acerto
          </button>
          <button
            type="button"
            onClick={() => setShowRedefinir((v) => !v)}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
              showRedefinir
                ? "bg-brand-100 text-brand-700"
                : "text-text-muted hover:bg-gray-100 hover:text-text-primary"
            }`}
          >
            <PenLine size={12} /> Redefinir preço
          </button>
        </div>
      </div>

      {/* Form redefinir preço */}
      {showRedefinir && (
        <div className="space-y-2 p-3 rounded-lg border border-brand-200 bg-brand-50/50">
          <p className="text-[11px] text-text-secondary">
            Define um novo preço final. Fica registado no histórico e substitui o total atual.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">Modo</label>
              <Select options={MODO_OPTIONS} value={redefModo} onChange={setRedefModo} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-text-secondary mb-1">
                {redefModo === "TOTAL" ? "Novo total (€)" : "€ por criança"}
              </label>
              <InputField
                type="number"
                step={0.01}
                min={0.01}
                value={redefModo === "TOTAL" ? redefValor : redefPorCabeca}
                onChange={(e) =>
                  redefModo === "TOTAL" ? setRedefValor(e.target.value) : setRedefPorCabeca(e.target.value)
                }
                placeholder="0,00"
              />
            </div>
          </div>
          {previewTotal && (
            <p className="text-[11px] text-brand-700 font-medium">
              = {previewTotal} ({numCriancas} crianças)
            </p>
          )}
          <div>
            <label className="block text-[11px] font-medium text-text-secondary mb-1">Nota *</label>
            <InputField
              value={redefMotivo}
              onChange={(e) => setRedefMotivo(e.target.value)}
              placeholder="Ex: preço combinado com o cliente, 45 € por criança..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowRedefinir(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleRedefinir} disabled={redefinirPreco.isPending}>
              {redefinirPreco.isPending ? "A guardar..." : "Redefinir"}
            </Button>
          </div>
        </div>
      )}

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
              ) : a.tipo === "REDEFINICAO" ? (
                <CornerUpRight size={14} className="text-brand-600 mt-0.5 shrink-0" />
              ) : (
                <Minus size={14} className="text-accent-red-500 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {a.tipo === "REDEFINICAO" ? (
                    <span className="text-sm font-semibold text-brand-700">
                      Redefinição → {fmtEuro.format(Number(a.valor))}
                    </span>
                  ) : (
                    <span
                      className={`text-sm font-semibold ${
                        a.tipo === "ACRESCIMO" ? "text-accent-green-600" : "text-accent-red-500"
                      }`}
                    >
                      {a.tipo === "ACRESCIMO" ? "+" : "−"} {fmtEuro.format(Number(a.valor))}
                    </span>
                  )}
                  {a.tipo === "REDEFINICAO" && a.precoPorCabeca != null && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
                      {fmtEuro.format(Number(a.precoPorCabeca))}/criança
                    </span>
                  )}
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
              {a.tipo !== "REDEFINICAO" && (
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
              )}
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

      {/* Form novo acerto (colapsado por defeito) */}
      {showNovo && (
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
      )}
    </div>
  );
}

export default React.memo(AjustesPagamentoSection);
