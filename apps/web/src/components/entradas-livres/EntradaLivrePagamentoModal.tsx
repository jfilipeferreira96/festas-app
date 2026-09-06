"use client";

import React, { useState, useCallback } from "react";
import { ArrowUpDown, CreditCard } from "lucide-react";
import { useAtualizarPagamentoEntradaLivre } from "@/hooks/use-entrada-livre";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import PagamentoModalShell, { type PagamentoTabConfig } from "@/components/shared/pagamento/PagamentoModalShell";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import { EPS, faltaPagar, totalPago, type PagamentoLedgerItem } from "@/lib/pagamento-ledger";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface EntradaLivrePagamentoModalProps {
  entrada: EntradaLivre;
  onClose: () => void;
}

export default function EntradaLivrePagamentoModal({ entrada, onClose }: EntradaLivrePagamentoModalProps) {
  const toast = useToast();
  const atualizarPagamento = useAtualizarPagamentoEntradaLivre();

  // Ledger de pagamentos (fonte única do recebido)
  const [pagamentos, setPagamentos] = useState<PagamentoLedgerItem[]>(() =>
    (entrada.pagamentos ?? []).map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo as PagamentoLedgerItem["metodo"],
      nota: p.nota ?? null,
      createdAt: p.createdAt,
    }))
  );
  // Acertos aplicam write-through ao custoTotal(Final) no backend - o override
  // mantém o total da modal sincronizado em tempo real
  const [custoOverride, setCustoOverride] = useState<number | null>(null);

  const custoBase = entrada.custoTotalFinal ?? entrada.custoTotal ?? 0;
  const custo = custoOverride ?? custoBase;
  const falta = faltaPagar(custo, pagamentos);
  const liquidado = falta <= EPS && custo > 0;

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
    try {
      await atualizarPagamento.mutateAsync({
        id: entrada.id,
        data: {
          // Replace-all do ledger; o estado `pago` é derivado no backend
          pagamentos: pagamentos.map((p) => ({
            valor: p.valor,
            metodo: p.metodo,
            nota: p.nota ?? undefined,
          })),
        },
      });
      toast.success("Pagamento atualizado com sucesso.");
      onClose();
    } catch (err) {
      toast.handleApiError(err, "Erro ao atualizar pagamento.");
    }
  }, [atualizarPagamento, entrada.id, pagamentos, toast, onClose]);

  const metodoLabel =
    pagamentos.length > 0
      ? pagamentos.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
      : undefined;

  const avisos = entrada.observacoesLesoes ? (
    <p className="text-xs text-text-secondary whitespace-pre-wrap">
      <span className="font-medium">Lesões / Alergias:</span> {entrada.observacoesLesoes}
    </p>
  ) : undefined;

  const resumo = (
    <>
      Total <span className="font-semibold text-text-secondary">{fmtEuro.format(custo)}</span>
      {" · "}Recebido <span className="font-semibold text-text-secondary">{fmtEuro.format(totalPago(pagamentos))}</span>
      {" · "}
      {liquidado ? (
        <span className="text-accent-green-600 font-semibold">Liquidado</span>
      ) : (
        <span className="text-accent-orange-600 font-semibold">Falta {fmtEuro.format(falta)}</span>
      )}
    </>
  );

  const tabs: PagamentoTabConfig[] = [
    {
      id: "pagamento",
      label: "Pagamento",
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <PagamentosLedgerSection
            totalDevido={custo}
            pagamentos={pagamentos}
            onAdd={(p) =>
              setPagamentos((prev) => [
                ...prev,
                { ...p, id: `pg-${Date.now()}-${prev.length}`, createdAt: new Date().toISOString() },
              ])
            }
            onRemove={(id) => setPagamentos((prev) => prev.filter((p) => p.id !== id))}
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
      pago={liquidado}
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
