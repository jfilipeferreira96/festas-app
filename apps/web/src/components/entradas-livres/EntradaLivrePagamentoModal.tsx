"use client";

import React, { useState, useCallback } from "react";
import { ArrowUpDown, Calculator, CreditCard, Printer, Wallet } from "lucide-react";
import { Button } from "@/components/ui";
import { imprimirTalaoEntrada } from "@/utils/print-talao";
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

/** Sugerido = custo calculado do tarifário + excesso registado na conclusão. */
function EntradaSugeridoBox({
  entrada,
  onUsarSugerido,
}: {
  entrada: EntradaLivre;
  onUsarSugerido: (valor: number) => void;
}) {
  const excesso = entrada.custoExcesso ?? 0;
  const sugerido = Number(entrada.custoTotal ?? 0) + excesso;
  if (sugerido <= 0) return null;

  return (
    <div className="rounded-lg border border-border bg-gray-50/50 p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Calculator size={13} className="text-text-muted" /> Total sugerido
        </span>
        <button
          type="button"
          onClick={() => onUsarSugerido(sugerido)}
          className="text-xs font-medium text-primary-600 hover:underline cursor-pointer"
        >
          Usar sugerido
        </button>
      </div>
      <div className="flex justify-between text-[11px] text-text-secondary">
        <span>Tempo + lanche + meias + extras</span>
        <span className="tabular-nums">{fmtEuro.format(Number(entrada.custoTotal ?? 0))}</span>
      </div>
      {excesso > 0 && (
        <div className="flex justify-between text-[11px] text-accent-orange-700">
          <span>Excesso de tempo</span>
          <span className="tabular-nums">+{fmtEuro.format(excesso)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs font-semibold text-text-primary pt-1 border-t border-border">
        <span>Sugerido</span>
        <span className="tabular-nums">{fmtEuro.format(sugerido)}</span>
      </div>
    </div>
  );
}

export default function EntradaLivrePagamentoModal({ entrada, onClose }: EntradaLivrePagamentoModalProps) {
  const toast = useToast();
  const atualizarPagamento = useAtualizarPagamentoEntradaLivre();

  // Total a pagar (só-leitura) - o valor acordado (final ?? calculado); muda
  // via "Usar sugerido" ou tab "Acertos", nunca por input livre.
  const [valorTotal, setValorTotal] = useState<string>(() => {
    const acordado = Number(entrada.custoTotalFinal ?? entrada.custoTotal ?? 0) || 0;
    if (acordado > 0) return String(acordado);
    const sugerido = Number(entrada.custoTotal ?? 0) + (entrada.custoExcesso ?? 0);
    return sugerido > 0 ? String(sugerido) : "";
  });
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

  const totalDevido = Number(valorTotal) || 0;
  const falta = faltaPagar(totalDevido, pagamentos);
  const liquidado = falta <= EPS && totalDevido > 0;

  // Acertos (tab "Acertos") aplicam write-through ao total devido no backend -
  // sincronizar o estado local para a falta subir/descer em tempo real.
  const handleAjusteAplicado = useCallback((delta: number) => {
    setValorTotal((prev) => Math.max(0, (Number(prev) || 0) + delta).toFixed(2));
  }, []);
  const handleTotalRedefinido = useCallback((novoTotal: number) => {
    setValorTotal(novoTotal.toFixed(2));
  }, []);

  const criancaNomes = entrada.criancas?.map((c) => c.nome).join(", ") || entrada.encarregadoNome || "-";

  const handleSave = useCallback(async () => {
    try {
      await atualizarPagamento.mutateAsync({
        id: entrada.id,
        data: {
          custoTotalFinal: valorTotal === "" ? null : Number(valorTotal),
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
  }, [atualizarPagamento, entrada.id, valorTotal, pagamentos, toast, onClose]);

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
          {/* Total acordado (só-leitura): muda via "Usar sugerido" ou tab Acertos */}
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
              Valor acordado da entrada. Para alterar: "Usar sugerido" em baixo ou tab "Acertos".
            </p>
          </div>

          {/* Ledger de pagamentos: adicionar (método obrigatório) até completar; pago derivado */}
          <PagamentosLedgerSection
            totalDevido={totalDevido}
            pagamentos={pagamentos}
            onAdd={(p) =>
              setPagamentos((prev) => [
                ...prev,
                { ...p, id: `pg-${Date.now()}-${prev.length}`, createdAt: new Date().toISOString() },
              ])
            }
            onRemove={(id) => setPagamentos((prev) => prev.filter((p) => p.id !== id))}
          />

          <EntradaSugeridoBox entrada={entrada} onUsarSugerido={(v) => setValorTotal(v.toFixed(2))} />
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

  const handleImprimirTalao = useCallback(() => {
    imprimirTalaoEntrada({
      id: entrada.id,
      inicioEm: entrada.inicioEm,
      fimPrevisto: entrada.fimPrevisto,
      duracaoMinutos: entrada.duracaoMinutos,
      criancas: entrada.criancas,
      encarregadoNome: entrada.encarregadoNome,
      extras: entrada.extras,
      meiasQuantidade: entrada.meiasQuantidade,
      temLanche: entrada.temLanche,
      custoTotal: entrada.custoTotal,
      // Total em memória: o talão reflecte o que está no ecrã (mesma lógica do save)
      custoTotalFinal: valorTotal === "" ? null : Number(valorTotal),
      // Ledger em memória: o utilizador imprime o talão com o que acabou de registar
      pagamentos: pagamentos.map((p) => ({ valor: p.valor, metodo: p.metodo, nota: p.nota })),
    });
  }, [entrada, pagamentos, valorTotal]);

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
