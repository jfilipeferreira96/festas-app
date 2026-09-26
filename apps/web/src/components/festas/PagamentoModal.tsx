"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ArrowUpDown, CreditCard, Shield, Wallet } from "lucide-react";
import { useUpdatePagamento, useReserva } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import PagamentoModalShell, { type PagamentoTabConfig } from "@/components/shared/pagamento/PagamentoModalShell";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import PagamentoCaucaoTab from "./PagamentoCaucaoTab";
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

  // Dados frescos: o save é replace-all - adotar a versão do servidor enquanto
  // o estado local está intocado evita apagar pagamentos de outro terminal.
  const { data: reservaFresca } = useReserva(reserva.id);
  const editouRef = useRef(false);
  const dados = reservaFresca ?? reserva;

  const totalAcordado = Number(reserva.valorTotal ?? 0) || 0;
  const [valorTotal, setValorTotal] = useState<string>(totalAcordado > 0 ? String(totalAcordado) : "");
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
  const [caucaoSintetizadaEm] = useState(
    () => reserva.pagamentos?.[0]?.createdAt ?? new Date().toISOString()
  );
  const [caucao, setCaucao] = useState<string>(reserva.caucao ?? "NAO_PAGA");
  const [valorCaucao, setValorCaucao] = useState<string>(reserva.valorCaucao ? String(reserva.valorCaucao) : "");
  const [metodoCaucao, setMetodoCaucao] = useState<string>(reserva.metodoCaucao ?? "NONE");

  useEffect(() => {
    if (!reservaFresca || editouRef.current) return;
    setPagamentos(
      (reservaFresca.pagamentos ?? []).map((p) => ({
        id: p.id,
        valor: Number(p.valor),
        metodo: p.metodo,
        nota: p.nota ?? null,
        createdAt: p.createdAt,
        fixa: p.nota === "Caução",
      }))
    );
    const acordado = Number(reservaFresca.valorTotal ?? 0) || 0;
    setValorTotal(acordado > 0 ? String(acordado) : "");
    setCaucao(reservaFresca.caucao ?? "NAO_PAGA");
    setValorCaucao(reservaFresca.valorCaucao ? String(reservaFresca.valorCaucao) : "");
    setMetodoCaucao(reservaFresca.metodoCaucao ?? "NONE");
  }, [reservaFresca]);

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

  const handleAjusteAplicado = useCallback((delta: number) => {
    editouRef.current = true;
    setValorTotal((prev) => Math.max(0, (Number(prev) || 0) + delta).toFixed(2));
  }, []);
  const handleTotalRedefinido = useCallback((novoTotal: number) => {
    editouRef.current = true;
    setValorTotal(novoTotal.toFixed(2));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updatePagamento.mutateAsync({
        id: reserva.id,
        data: {
          valorTotal: valorTotal === "" ? null : Number(valorTotal),
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

  const anvNome = dados.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || dados.cliente?.nome || "-";
  const metodoLabel =
    ledgerEfetivo.length > 0
      ? ledgerEfetivo.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
      : undefined;

  const cacifoNotas = (dados.cacifos ?? []).filter((c) => c.notas?.trim());
  const temAvisos = Boolean(dados.notasCacifos || dados.observacoesLesoes || cacifoNotas.length > 0);

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
      {dados.notasCacifos && (
        <p className="text-xs text-text-secondary whitespace-pre-wrap">
          <span className="font-medium">Notas cacifos:</span> {dados.notasCacifos}
        </p>
      )}
      {cacifoNotas.map((c) => (
        <p key={c.id} className="text-xs text-text-secondary">
          <span className="font-medium">Cacifo {c.numero}:</span> {c.notas}
        </p>
      ))}
      {dados.observacoesLesoes && (
        <p className="text-xs text-text-secondary whitespace-pre-wrap">
          <span className="font-medium">Lesões / Alergias:</span> {dados.observacoesLesoes}
        </p>
      )}
    </>
  ) : undefined;

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
      </>
    ) : undefined;

  const caucaoPaga = dados.caucao === "PAGA";
  const tabs: PagamentoTabConfig[] = [];
  if (!caucaoPaga) {
    tabs.push({
      id: "caucao",
      label: "Caução",
      icon: Shield,
      content: (
        <PagamentoCaucaoTab
          caucao={caucao}
          setCaucao={(v) => {
            editouRef.current = true;
            setCaucao(v);
          }}
          valorCaucao={valorCaucao}
          setValorCaucao={(v) => {
            editouRef.current = true;
            setValorCaucao(v);
          }}
          metodoCaucao={metodoCaucao}
          setMetodoCaucao={(v) => {
            editouRef.current = true;
            setMetodoCaucao(v);
          }}
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
              Valor acordado da festa. Para alterar: tab "Acertos".
            </p>
          </div>

          <PagamentosLedgerSection
            totalDevido={totalDevido}
            pagamentos={ledgerEfetivo}
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
          reservaId={reserva.id}
          numCriancas={dados.numCriancasConfirmadas ?? dados.numCriancas}
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
