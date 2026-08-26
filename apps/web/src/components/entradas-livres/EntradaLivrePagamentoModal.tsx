"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import Switch from "@/components/form/switch/Switch";
import { useAtualizarPagamentoEntradaLivre } from "@/hooks/use-entrada-livre";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

const METODO_PAGAMENTO_OPTIONS = [
  { value: "NONE", label: "Não definido" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "MULTIBANCO", label: "Multibanco" },
  { value: "MBWAY", label: "MB WAY" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CARTAO", label: "Cartão" },
  { value: "OUTRO", label: "Outro" },
];

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

  const custo = entrada.custoTotalFinal ?? entrada.custoTotal ?? 0;
  const criancaNomes = entrada.criancas?.map(c => c.nome).join(", ") || entrada.encarregadoNome || "—";

  const handleSave = useCallback(async () => {
    const metodo = metodoPagamento === "NONE" || metodoPagamento === "" ? undefined : metodoPagamento;
    try {
      await atualizarPagamento.mutateAsync({
        id: entrada.id,
        data: { pago, metodoPagamento: metodo },
      });
      toast.success("Pagamento atualizado com sucesso.");
      onClose();
    } catch (err) {
      toast.handleApiError(err, "Erro ao atualizar pagamento.");
    }
  }, [atualizarPagamento, entrada.id, pago, metodoPagamento, toast, onClose]);

  const isLoading = atualizarPagamento.isPending;

  return (
    <Modal isOpen onClose={onClose} size="md" title={`Pagamento — ${criancaNomes}`}>
      <div className="p-5 space-y-4">
        {/* Custo */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <span className="text-sm text-text-secondary">Custo Total</span>
          <span className="text-lg font-bold text-text-primary">{fmtEuro.format(custo)}</span>
        </div>

        {/* Estado */}
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

        {/* Acertos de pagamento (acrécimos/descontos com nota) */}
        <AjustesPagamentoSection entradaLivreId={entrada.id} />

        {/* Footer */}
        <div className="flex items-center gap-3 pt-2 lg:justify-end">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
