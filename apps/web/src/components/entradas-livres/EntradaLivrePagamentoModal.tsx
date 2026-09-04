"use client";

import React, { useState, useCallback } from "react";
import { CreditCard, ArrowUpDown } from "lucide-react";
import { useAtualizarPagamentoEntradaLivre } from "@/hooks/use-entrada-livre";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import PagamentoModalShell, { type PagamentoTabConfig } from "@/components/shared/pagamento/PagamentoModalShell";
import {
  PagamentoEstadoRow,
  PagamentoMetodoField,
  PagamentoSplitSection,
} from "@/components/shared/pagamento/PagamentoFields";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
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
  const [showSplit, setShowSplit] = useState(Boolean(entrada.metodoPagamento2));
  const [metodoPagamento2, setMetodoPagamento2] = useState(entrada.metodoPagamento2 ?? "NONE");
  const [valorPago2, setValorPago2] = useState(entrada.valorPago2 != null ? String(entrada.valorPago2) : "");
  // Acertos aplicam write-through ao custoTotal(Final) no backend - o override
  // mantém o total da modal sincronizado em tempo real
  const [custoOverride, setCustoOverride] = useState<number | null>(null);

  const custoBase = entrada.custoTotalFinal ?? entrada.custoTotal ?? 0;
  const custo = custoOverride ?? custoBase;

  const handleAjusteAplicado = useCallback(
    (delta: number) => {
      setCustoOverride(Math.max(0, custoBase + delta));
    },
    [custoBase]
  );
  const handleTotalRedefinido = useCallback((novoTotal: number) => {
    setCustoOverride(novoTotal);
  }, []);
  const criancaNomes = entrada.criancas?.map((c) => c.nome).join(", ") || entrada.encarregadoNome || "-";

  const handleSave = useCallback(async () => {
    // "Não definido" deve LIMPAR o método guardado - null (não undefined),
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

  const metodoLabel =
    metodoPagamento !== "NONE"
      ? metodoPagamentoLabel(metodoPagamento) +
        (showSplit && metodoPagamento2 !== "NONE" ? ` + ${metodoPagamentoLabel(metodoPagamento2)}` : "")
      : undefined;

  const avisos = entrada.observacoesLesoes ? (
    <p className="text-xs text-text-secondary whitespace-pre-wrap">
      <span className="font-medium">Lesões / Alergias:</span> {entrada.observacoesLesoes}
    </p>
  ) : undefined;

  const resumo = (
    <>
      Total <span className="font-semibold text-text-secondary">{fmtEuro.format(custo)}</span>
    </>
  );

  const tabs: PagamentoTabConfig[] = [
    {
      id: "pagamento",
      label: "Pagamento",
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <PagamentoEstadoRow pago={pago} onChange={setPago} />
          <PagamentoMetodoField value={metodoPagamento} onChange={setMetodoPagamento} obrigatorioQuandoPago={pago} />
          <PagamentoSplitSection
            show={showSplit}
            onToggle={setShowSplit}
            metodo2={metodoPagamento2}
            setMetodo2={setMetodoPagamento2}
            valor2={valorPago2}
            setValor2={setValorPago2}
          />
        </div>
      ),
    },
    {
      id: "acertos",
      label: "Acertos",
      icon: ArrowUpDown,
      content: (
        <AjustesPagamentoSection
          entradaLivreId={entrada.id}
          numCriancas={Array.isArray(entrada.criancas) ? entrada.criancas.length : 0}
          onAjusteAplicado={handleAjusteAplicado}
          onTotalRedefinido={handleTotalRedefinido}
        />
      ),
    },
  ];

  return (
    <PagamentoModalShell
      titulo={`Pagamento - ${criancaNomes}`}
      onClose={onClose}
      onSave={handleSave}
      isLoading={atualizarPagamento.isPending}
      pago={pago}
      metodoLabel={metodoLabel}
      heroDireita={
        <span className="text-sm font-bold text-text-primary shrink-0">Total {fmtEuro.format(custo)}</span>
      }
      avisos={avisos}
      tabs={tabs}
      resumo={resumo}
    />
  );
}
