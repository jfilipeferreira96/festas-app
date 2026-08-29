"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import Switch from "@/components/form/switch/Switch";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import { useAtualizarPagamentoEntradaLivre } from "@/hooks/use-entrada-livre";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import { METODO_PAGAMENTO_OPTIONS, metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface EntradaLivrePagamentoModalProps {
  entrada: EntradaLivre;
  onClose: () => void;
}

export default function EntradaLivrePagamentoModal({ entrada, onClose }: EntradaLivrePagamentoModalProps) {
  const toast = useToast();
  const atualizarPagamento = useAtualizarPagamentoEntradaLivre();

  const [pago, setPago] = useState(entrada.pago);
  const [metodoPagamento, setMetodoPagamento] = useState(entrada.metodoPagamento ?? "NONE");

  // Pagamento dividido (2º método) — escondido por omissão, como na modal das festas
  const [showSplit, setShowSplit] = useState(Boolean(entrada.metodoPagamento2));
  const [metodoPagamento2, setMetodoPagamento2] = useState(entrada.metodoPagamento2 ?? "NONE");
  const [valorPago2, setValorPago2] = useState(entrada.valorPago2 != null ? String(entrada.valorPago2) : "");

  const custo = entrada.custoTotalFinal ?? entrada.custoTotal ?? 0;
  const criancaNomes = entrada.criancas?.map(c => c.nome).join(", ") || entrada.encarregadoNome || "—";

  const handleSave = useCallback(async () => {
    // "Não definido" deve LIMPAR o método guardado — null (não undefined),
    // porque undefined = "sem alterações" no Prisma (mesmo comportamento
    // da modal de pagamento das festas).
    const metodo = metodoPagamento === "NONE" || metodoPagamento === "" ? null : metodoPagamento;
    const metodo2 = showSplit && metodoPagamento2 && metodoPagamento2 !== "NONE" ? metodoPagamento2 : null;
    const valor2 = showSplit && valorPago2 !== "" ? Number(valorPago2) : null;
    try {
      await atualizarPagamento.mutateAsync({
        id: entrada.id,
        data: { pago, metodoPagamento: metodo, metodoPagamento2: metodo2, valorPago2: valor2 },
      });
      toast.success("Pagamento atualizado com sucesso.");
      onClose();
    } catch (err) {
      toast.handleApiError(err, "Erro ao atualizar pagamento.");
    }
  }, [atualizarPagamento, entrada.id, pago, metodoPagamento, showSplit, metodoPagamento2, valorPago2, toast, onClose]);

  const isLoading = atualizarPagamento.isPending;

  return (
    <Modal isOpen onClose={onClose} size="lg" title={`Pagamento — ${criancaNomes}`}>
      <div className="p-5 flex flex-col max-h-[70vh]">

        {/* ── Hero: estado + total (sempre visível) ── */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2.5 min-w-0">
            {pago ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green-50 border border-accent-green-200 text-accent-green-700 text-xs font-semibold shrink-0">
                <CheckCircle2 size={13} /> Pago
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-orange-50 border border-accent-orange-200 text-accent-orange-700 text-xs font-semibold shrink-0">
                <Wallet size={13} /> Por pagar
              </span>
            )}
            {metodoPagamento !== "NONE" && (
              <span className="text-xs text-text-muted truncate">
                {metodoPagamentoLabel(metodoPagamento)}
                {showSplit && metodoPagamento2 !== "NONE" ? ` + ${metodoPagamentoLabel(metodoPagamento2)}` : ""}
              </span>
            )}
          </div>
          <span className="text-sm font-bold text-text-primary shrink-0">
            Total {fmtEuro.format(custo)}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pt-4 space-y-4">
          {/* Estado do pagamento */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2">
              {pago ? <CheckCircle2 size={18} className="text-accent-green-500" /> : <Wallet size={18} className="text-accent-orange-500" />}
              <span className="text-sm font-medium text-text-primary">
                {pago ? "Pago" : "Por pagar"}
              </span>
            </div>
            <Switch checked={pago} onChange={setPago} />
          </div>

          {/* Método */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Método de Pagamento {pago && "*"}</label>
            <Select
              options={METODO_PAGAMENTO_OPTIONS}
              value={metodoPagamento}
              onChange={setMetodoPagamento}
              placeholder="Seleccionar..."
            />
            {pago && <p className="text-xs text-text-muted mt-1">* Obrigatório quando marcado como pago</p>}
          </div>

          {/* Pagamento dividido (2º método) — escondido por omissão */}
          <div className="border-t border-border pt-3 space-y-2">
            <Checkbox
              checked={showSplit}
              onChange={setShowSplit}
              label="Dividir pagamento (2º método)"
            />
            {showSplit && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">2º Método</label>
                  <Select options={METODO_PAGAMENTO_OPTIONS} value={metodoPagamento2} onChange={setMetodoPagamento2} placeholder="2º método..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Valor 2º (€)</label>
                  <InputField type="number" step={0.01} min={0} value={valorPago2} onChange={(e) => setValorPago2(e.target.value)} placeholder="0,00" />
                </div>
              </div>
            )}
          </div>

          {/* Acertos de pagamento (acrécimos/descontos/redefinições com nota) */}
          <div className="border-t border-border pt-3">
            <AjustesPagamentoSection
              entradaLivreId={entrada.id}
              numCriancas={Array.isArray(entrada.criancas) ? entrada.criancas.length : 0}
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "A guardar..." : "Guardar Pagamento"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
