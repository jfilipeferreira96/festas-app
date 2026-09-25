"use client";

import React, { useMemo, useState, useCallback } from "react";
import { ArrowUpDown, CreditCard, Shield, Wallet } from "lucide-react";
import { useUpdatePagamento } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import PagamentoModalShell, { type PagamentoTabConfig } from "@/components/shared/pagamento/PagamentoModalShell";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import PagamentoCaucaoTab from "./PagamentoCaucaoTab";
import PagamentoSugeridoBox, { calcularSugeridoFesta } from "./PagamentoSugeridoBox";
import type { Reserva } from "@/lib/api/reservas";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import {
  EPS,
  faltaPagar,
  totalPago,
  comCaucaoNoLedger,
  type PagamentoLedgerItem,
} from "@/lib/pagamento-ledger";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface PagamentoModalProps {
  reserva: Reserva;
  onClose: () => void;
}

export default function PagamentoModal({ reserva, onClose }: PagamentoModalProps) {
  const toast = useToast();
  const updatePagamento = useUpdatePagamento();

  // Total a pagar (só-leitura) - o valor acordado; muda via "Usar sugerido"
  // ou tab "Acertos" (com auditoria), nunca por input livre. Descontos
  // percentuais existentes na reserva (legado) continuam no sugerido.
  const descontoReserva = Number(reserva.descontoPercentagem) || 0;
  const totalAcordado = Number(reserva.valorTotal ?? 0) || 0;
  const [valorTotal, setValorTotal] = useState<string>(() => {
    if (totalAcordado > 0) return String(totalAcordado);
    const sugerido = calcularSugeridoFesta(reserva, descontoReserva)?.sugerido ?? 0;
    return sugerido > 0 ? String(sugerido) : "";
  });
  // Ledger manual (linhas da BD + adições do utilizador). Linhas "Caução" são
  // fixas: a caução paga é imutável (CAUCAO_BLOQUEADA no backend).
  const [pagamentos, setPagamentos] = useState<PagamentoLedgerItem[]>(() =>
    (reserva.pagamentos ?? []).map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo,
      nota: p.nota ?? null,
      createdAt: p.createdAt,
      fixa: p.nota === "Caução",
    }))
  );
  // Data estável para a linha sintetizada da caução (evita saltos na ordenação).
  const [caucaoSintetizadaEm] = useState(
    () => reserva.pagamentos?.[0]?.createdAt ?? new Date().toISOString()
  );
  const [caucao, setCaucao] = useState<string>(reserva.caucao ?? "NAO_PAGA");
  const [valorCaucao, setValorCaucao] = useState<string>(reserva.valorCaucao ? String(reserva.valorCaucao) : "");
  const [metodoCaucao, setMetodoCaucao] = useState<string>(reserva.metodoCaucao ?? "NONE");

  // Caução paga = linha fixa no ledger (já foi recebida e desconta a falta).
  // Sintetizada quando não existe linha "Caução" - desconta logo ao marcar
  // como paga na tab e é persistida no guardar (o backend não duplica).
  const valorCaucaoNum = caucao === "PAGA" ? Number(valorCaucao) || 0 : 0;
  const ledgerEfetivo = useMemo(
    () =>
      comCaucaoNoLedger(
        pagamentos,
        { estado: caucao, valor: valorCaucaoNum, metodo: metodoCaucao },
        caucaoSintetizadaEm
      ),
    [pagamentos, caucao, valorCaucaoNum, metodoCaucao, caucaoSintetizadaEm]
  );

  const totalDevido = Number(valorTotal) || 0;
  const falta = faltaPagar(totalDevido, ledgerEfetivo);
  const liquidado = falta <= EPS && totalDevido > 0;

  // Acertos (tab "Acertos") aplicam write-through ao total devido no backend -
  // sincronizar o estado local para a falta subir/descer em tempo real.
  const handleAjusteAplicado = useCallback((delta: number) => {
    setValorTotal((prev) => Math.max(0, (Number(prev) || 0) + delta).toFixed(2));
  }, []);
  const handleTotalRedefinido = useCallback((novoTotal: number) => {
    setValorTotal(novoTotal.toFixed(2));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updatePagamento.mutateAsync({
        id: reserva.id,
        data: {
          valorTotal: valorTotal === "" ? null : Number(valorTotal),
          // Replace-all do ledger (inclui a linha fixa da caução); o estado
          // `pago` é derivado no backend. Descontos ficam na tab "Acertos".
          pagamentos: ledgerEfetivo.map((p) => ({
            valor: p.valor,
            metodo: p.metodo,
            nota: p.nota ?? undefined,
          })),
          caucao: caucao || undefined,
          valorCaucao: valorCaucao === "" ? undefined : Number(valorCaucao),
          metodoCaucao: metodoCaucao === "NONE" ? undefined : metodoCaucao || undefined,
        },
      });
      toast.success("Pagamento atualizado com sucesso.");
      onClose();
    } catch (err) {
      toast.handleApiError(err, "Erro ao atualizar pagamento.");
    }
  }, [
    updatePagamento,
    reserva.id,
    valorTotal,
    ledgerEfetivo,
    caucao,
    valorCaucao,
    metodoCaucao,
    toast,
    onClose,
  ]);

  const anvNome = reserva.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || reserva.cliente?.nome || "-";
  const metodoLabel =
    ledgerEfetivo.length > 0
      ? ledgerEfetivo.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
      : undefined;

  const cacifoNotas = (reserva.cacifos ?? []).filter((c) => c.notas?.trim());
  const temAvisos = Boolean(reserva.notasCacifos || reserva.observacoesLesoes || cacifoNotas.length > 0);

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

  const avisos = temAvisos ? (
    <>
      {reserva.notasCacifos && (
        <p className="text-xs text-text-secondary whitespace-pre-wrap">
          <span className="font-medium">Notas cacifos:</span> {reserva.notasCacifos}
        </p>
      )}
      {cacifoNotas.map((c) => (
        <p key={c.id} className="text-xs text-text-secondary">
          <span className="font-medium">Cacifo {c.numero}:</span> {c.notas}
        </p>
      ))}
      {reserva.observacoesLesoes && (
        <p className="text-xs text-text-secondary whitespace-pre-wrap">
          <span className="font-medium">Lesões / Alergias:</span> {reserva.observacoesLesoes}
        </p>
      )}
    </>
  ) : undefined;

  const sugeridoResumo = calcularSugeridoFesta(reserva, descontoReserva);
  const partesSugeridas: string[] = [];
  if (sugeridoResumo && sugeridoResumo.custoExtras > 0) partesSugeridas.push(`+${fmtEuro.format(sugeridoResumo.custoExtras)} extras`);
  if (sugeridoResumo && sugeridoResumo.custoMeias > 0) partesSugeridas.push(`+${fmtEuro.format(sugeridoResumo.custoMeias)} meias`);

  const resumo =
    totalDevido > 0 ? (
      <>
        A pagar <span className="font-semibold text-text-secondary">{fmtEuro.format(totalDevido)}</span>
        {" · "}Recebido <span className="font-semibold text-text-secondary">{fmtEuro.format(totalPago(ledgerEfetivo))}</span>
        {" · "}
        {liquidado ? (
          <span className="text-accent-green-600 font-semibold">Liquidado</span>
        ) : (
          <span className="text-accent-orange-600 font-semibold">Falta {fmtEuro.format(falta)}</span>
        )}
        {partesSugeridas.length > 0 && (
          <span className="text-text-muted"> · {partesSugeridas.join(" · ")} (sugerido)</span>
        )}
      </>
    ) : partesSugeridas.length > 0 ? (
      <span className="text-text-muted">{partesSugeridas.join(" · ")} (sugerido)</span>
    ) : undefined;

  // Caução paga é imutável (CAUCAO_BLOQUEADA no backend): a tab "Caução" só
  // existe enquanto não está paga - a caução paga vive no ledger como linha
  // fixa "Caução" (e na tabela/detail da festa). Descontos: tab "Acertos".
  const caucaoPaga = reserva.caucao === "PAGA";
  // Caução em primeiro: os pais pagam a caução à partida e o restante no dia
  const tabs: PagamentoTabConfig[] = [];
  if (!caucaoPaga) {
    tabs.push({
      id: "caucao",
      label: "Caução",
      icon: Shield,
      content: (
        <PagamentoCaucaoTab
          caucao={caucao}
          setCaucao={setCaucao}
          valorCaucao={valorCaucao}
          setValorCaucao={setValorCaucao}
          metodoCaucao={metodoCaucao}
          setMetodoCaucao={setMetodoCaucao}
        />
      ),
    });
  }
  tabs.push(
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
              Valor acordado da festa. Para alterar: "Usar sugerido" em baixo ou tab "Acertos".
            </p>
          </div>

          {/* Ledger de pagamentos: adicionar (método obrigatório) até completar; pago derivado */}
          <PagamentosLedgerSection
            totalDevido={totalDevido}
            pagamentos={ledgerEfetivo}
            onAdd={(p) =>
              setPagamentos((prev) => [
                ...prev,
                { ...p, id: `pg-${Date.now()}-${prev.length}`, createdAt: new Date().toISOString() },
              ])
            }
            onRemove={(id) => setPagamentos((prev) => prev.filter((p) => p.id !== id))}
          />

          <PagamentoSugeridoBox
            reserva={reserva}
            descontoPercentagem={descontoReserva}
            onUsarSugerido={(v) => setValorTotal(v.toFixed(2))}
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
          reservaId={reserva.id}
          numCriancas={reserva.numCriancasConfirmadas ?? reserva.numCriancas}
          onAjusteAplicado={handleAjusteAplicado}
          onTotalRedefinido={handleTotalRedefinido}
        />
      ),
    }
  );

  return (
    <PagamentoModalShell
      titulo={`Pagamento - ${anvNome}`}
      onClose={onClose}
      onSave={handleSave}
      isLoading={updatePagamento.isPending}
      pago={liquidado}
      metodoLabel={metodoLabel}
      heroDireita={heroDireita}
      avisos={avisos}
      tabs={tabs}
      resumo={resumo}
    />
  );
}
