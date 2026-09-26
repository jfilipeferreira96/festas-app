"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { ArrowUpDown, CreditCard, Printer, Wallet } from "lucide-react";
import { Button } from "@/components/ui";
import { imprimirTalaoEntrada } from "@/utils/print-talao";
import { useAtualizarPagamentoEntradaLivre, useEntradaLivre } from "@/hooks/use-entrada-livre";
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

  // Dados frescos: o save é replace-all - adotar a versão do servidor enquanto
  // o estado local está intocado evita apagar pagamentos de outro terminal.
  const { data: entradaFresca } = useEntradaLivre(entrada.id);
  const editouRef = useRef(false);
  const dados = entradaFresca ?? entrada;

  const [valorTotal, setValorTotal] = useState<string>(() => {
    const acordado = Number(entrada.custoTotalFinal ?? entrada.custoTotal ?? 0) || 0;
    return acordado > 0 ? String(acordado) : "";
  });
  const [pagamentos, setPagamentos] = useState<PagamentoLedgerItem[]>(() =>
    (entrada.pagamentos ?? []).map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo as PagamentoLedgerItem["metodo"],
      nota: p.nota ?? null,
      createdAt: p.createdAt,
    }))
  );

  useEffect(() => {
    if (!entradaFresca || editouRef.current) return;
    setPagamentos(
      (entradaFresca.pagamentos ?? []).map((p) => ({
        id: p.id,
        valor: Number(p.valor),
        metodo: p.metodo as PagamentoLedgerItem["metodo"],
        nota: p.nota ?? null,
        createdAt: p.createdAt,
      }))
    );
    const acordado = Number(entradaFresca.custoTotalFinal ?? entradaFresca.custoTotal ?? 0) || 0;
    setValorTotal(acordado > 0 ? String(acordado) : "");
  }, [entradaFresca]);

  const totalDevido = Number(valorTotal) || 0;
  const falta = faltaPagar(totalDevido, pagamentos);
  const liquidado = falta <= EPS && totalDevido > 0;

  const handleAjusteAplicado = useCallback((delta: number) => {
    editouRef.current = true;
    setValorTotal((prev) => Math.max(0, (Number(prev) || 0) + delta).toFixed(2));
  }, []);
  const handleTotalRedefinido = useCallback((novoTotal: number) => {
    editouRef.current = true;
    setValorTotal(novoTotal.toFixed(2));
  }, []);

  const criancaNomes = dados.criancas?.map((c) => c.nome).join(", ") || dados.encarregadoNome || "-";

  const handleSave = useCallback(async () => {
    try {
      await atualizarPagamento.mutateAsync({
        id: entrada.id,
        data: {
          custoTotalFinal: valorTotal === "" ? null : Number(valorTotal),
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
  }, [atualizarPagamento, entrada.id, valorTotal, pagamentos, toast, onClose]);

  const metodoLabel =
    pagamentos.length > 0
      ? pagamentos.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
      : undefined;

  const avisos = dados.observacoesLesoes ? (
    <p className="text-xs text-text-secondary whitespace-pre-wrap">
      <span className="font-medium">Lesões / Alergias:</span> {dados.observacoesLesoes}
    </p>
  ) : undefined;

  const resumo = (
    <>
      A pagar <span className="font-semibold text-text-secondary">{fmtEuro.format(totalDevido)}</span>
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
          <div className="rounded-lg border border-border bg-gray-50/50 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                <Wallet size={14} className="text-text-muted" /> Total a pagar
              </span>
              <span className="text-sm font-bold text-text-primary tabular-nums">
                {fmtEuro.format(totalDevido)}
              </span>
            </div>
            <p className="text-[11px] text-text-muted">
              Valor acordado da entrada. Para alterar: tab "Acertos".
            </p>
          </div>

          <PagamentosLedgerSection
            totalDevido={totalDevido}
            pagamentos={pagamentos}
            onAdd={(p) => {
              editouRef.current = true;
              setPagamentos((prev) => [
                ...prev,
                { ...p, id: `pg-${Date.now()}-${prev.length}`, createdAt: new Date().toISOString() },
              ]);
            }}
            onRemove={(id) => {
              editouRef.current = true;
              setPagamentos((prev) => prev.filter((p) => p.id !== id));
            }}
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
          numCriancas={Array.isArray(dados.criancas) ? dados.criancas.length : 0}
          onAjusteAplicado={handleAjusteAplicado}
          onTotalRedefinido={handleTotalRedefinido}
        />
      ),
    },
  ];

  const handleImprimirTalao = useCallback(() => {
    imprimirTalaoEntrada({
      id: entrada.id,
      inicioEm: dados.inicioEm,
      fimPrevisto: dados.fimPrevisto,
      duracaoMinutos: dados.duracaoMinutos,
      criancas: dados.criancas,
      encarregadoNome: dados.encarregadoNome,
      extras: dados.extras,
      meiasQuantidade: dados.meiasQuantidade,
      temLanche: dados.temLanche,
      custoTotal: dados.custoTotal,
      custoTotalFinal: valorTotal === "" ? null : Number(valorTotal),
      pagamentos: pagamentos.map((p) => ({ valor: p.valor, metodo: p.metodo, nota: p.nota })),
    });
  }, [entrada.id, dados, pagamentos, valorTotal]);

  const heroDireita =
    totalDevido > 0 ? (
      falta > 0 ? (
        <span className="text-sm font-bold text-accent-orange-700 shrink-0">
          Falta liquidar {fmtEuro.format(falta)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-accent-green-700 shrink-0">
          Liquidado
        </span>
      )
    ) : undefined;

  return (
    <PagamentoModalShell
      titulo={`Pagamento - ${criancaNomes}`}
      onClose={onClose}
      onSave={handleSave}
      isLoading={atualizarPagamento.isPending}
      pago={liquidado}
      metodoLabel={metodoLabel}
      heroDireita={heroDireita}
      avisos={avisos}
      tabs={tabs}
      resumo={resumo}
      acaoExtra={
        <Button variant="outline" onClick={handleImprimirTalao} className="flex items-center gap-1.5">
          <Printer size={14} /> Talão
        </Button>
      }
    />
  );
}
