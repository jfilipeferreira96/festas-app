"use client";

import React, { useState, useCallback } from "react";
import { ArrowUpDown, CreditCard, Shield } from "lucide-react";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import { useUpdatePagamento } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import PagamentoModalShell, { type PagamentoTabConfig } from "@/components/shared/pagamento/PagamentoModalShell";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import PagamentoCaucaoDescontoTab from "./PagamentoCaucaoDescontoTab";
import PagamentoSugeridoBox, { calcularSugeridoFesta } from "./PagamentoSugeridoBox";
import type { Reserva } from "@/lib/api/reservas";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import { EPS, faltaPagar, totalPago, type PagamentoLedgerItem } from "@/lib/pagamento-ledger";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface PagamentoModalProps {
  reserva: Reserva;
  onClose: () => void;
}

export default function PagamentoModal({ reserva, onClose }: PagamentoModalProps) {
  const toast = useToast();
  const updatePagamento = useUpdatePagamento();

  // Total a pagar (editável) - o valor acordado
  const [valorTotal, setValorTotal] = useState<string>(
    String(Number(reserva.valorTotal ?? 0) || "")
  );
  // Ledger de pagamentos (fonte única do recebido)
  const [pagamentos, setPagamentos] = useState<PagamentoLedgerItem[]>(() =>
    (reserva.pagamentos ?? []).map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo,
      nota: p.nota ?? null,
      createdAt: p.createdAt,
    }))
  );
  const [caucao, setCaucao] = useState<string>(reserva.caucao ?? "NAO_PAGA");
  const [valorCaucao, setValorCaucao] = useState<string>(reserva.valorCaucao ? String(reserva.valorCaucao) : "");
  const [descontoPercentagem, setDescontoPercentagem] = useState<string>(
    reserva.descontoPercentagem ? String(reserva.descontoPercentagem) : ""
  );
  const [descontoMotivo, setDescontoMotivo] = useState(reserva.descontoMotivo ?? "");

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

  const handleSave = useCallback(async () => {
    try {
      await updatePagamento.mutateAsync({
        id: reserva.id,
        data: {
          valorTotal: valorTotal === "" ? null : Number(valorTotal),
          // Replace-all do ledger; o estado `pago` é derivado no backend
          pagamentos: pagamentos.map((p) => ({
            valor: p.valor,
            metodo: p.metodo,
            nota: p.nota ?? undefined,
          })),
          caucao: caucao || undefined,
          valorCaucao: valorCaucao === "" ? undefined : Number(valorCaucao),
          descontoPercentagem: descontoPercentagem === "" ? undefined : Number(descontoPercentagem),
          descontoMotivo: descontoMotivo || undefined,
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
    pagamentos,
    caucao,
    valorCaucao,
    descontoPercentagem,
    descontoMotivo,
    toast,
    onClose,
  ]);

  const anvNome = reserva.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || reserva.cliente?.nome || "-";
  const metodoLabel =
    pagamentos.length > 0
      ? pagamentos.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
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

  const sugeridoResumo = calcularSugeridoFesta(reserva, Number(descontoPercentagem) || 0);
  const partesSugeridas: string[] = [];
  if (sugeridoResumo && sugeridoResumo.custoExtras > 0) partesSugeridas.push(`+${fmtEuro.format(sugeridoResumo.custoExtras)} extras`);
  if (sugeridoResumo && sugeridoResumo.custoMeias > 0) partesSugeridas.push(`+${fmtEuro.format(sugeridoResumo.custoMeias)} meias`);

  const resumo =
    totalDevido > 0 ? (
      <>
        A pagar <span className="font-semibold text-text-secondary">{fmtEuro.format(totalDevido)}</span>
        {" · "}Recebido <span className="font-semibold text-text-secondary">{fmtEuro.format(totalPago(pagamentos))}</span>
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

  const tabs: PagamentoTabConfig[] = [
    {
      id: "pagamento",
      label: "Pagamento",
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          {/* Total a pagar (editável) */}
          <div>
            <FieldLabel required>Total a pagar (€)</FieldLabel>
            <InputField
              type="number"
              step={0.01}
              min={0}
              value={valorTotal}
              onChange={(e) => setValorTotal(e.target.value)}
              placeholder="0,00"
            />
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

          <PagamentoSugeridoBox
            reserva={reserva}
            descontoPercentagem={Number(descontoPercentagem) || 0}
            onUsarSugerido={(v) => setValorTotal(v.toFixed(2))}
          />
        </div>
      ),
    },
    {
      id: "caucao",
      label: "Caução & Desconto",
      icon: Shield,
      content: (
        <PagamentoCaucaoDescontoTab
          caucao={caucao}
          setCaucao={setCaucao}
          valorCaucao={valorCaucao}
          setValorCaucao={setValorCaucao}
          descontoPercentagem={descontoPercentagem}
          setDescontoPercentagem={setDescontoPercentagem}
          descontoMotivo={descontoMotivo}
          setDescontoMotivo={setDescontoMotivo}
        />
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
    },
  ];

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
