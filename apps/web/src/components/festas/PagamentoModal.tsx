"use client";

import React, { useState, useCallback, useEffect } from "react";
import { CreditCard, Shield, CheckCircle2, ArrowUpDown } from "lucide-react";
import InputField from "@/components/form/input/InputField";
import { useUpdatePagamento } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import PagamentoModalShell, { type PagamentoTabConfig } from "@/components/shared/pagamento/PagamentoModalShell";
import {
  PagamentoEstadoRow,
  PagamentoMetodoField,
  PagamentoSplitSection,
} from "@/components/shared/pagamento/PagamentoFields";
import PagamentoCaucaoDescontoTab from "./PagamentoCaucaoDescontoTab";
import PagamentoSugeridoBox, { calcularSugeridoFesta } from "./PagamentoSugeridoBox";
import type { Reserva, MetodoPagamento } from "@/lib/api/reservas";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

interface PagamentoModalProps {
  reserva: Reserva;
  onClose: () => void;
}

export default function PagamentoModal({ reserva, onClose }: PagamentoModalProps) {
  const toast = useToast();
  const updatePagamento = useUpdatePagamento();

  const [pago, setPago] = useState(reserva.pago);
  const [metodoPagamento, setMetodoPagamento] = useState(reserva.metodoPagamento ?? "NONE");
  const [valorPago, setValorPago] = useState<string>(reserva.valorPago ? String(reserva.valorPago) : "");
  const [referenciaPagamento, setReferenciaPagamento] = useState(reserva.referenciaPagamento ?? "");
  const [showSplit, setShowSplit] = useState(!!reserva.metodoPagamento2);
  const [metodoPagamento2, setMetodoPagamento2] = useState(reserva.metodoPagamento2 ?? "NONE");
  const [valorPago2, setValorPago2] = useState<string>(reserva.valorPago2 ? String(reserva.valorPago2) : "");
  const [caucao, setCaucao] = useState<string>(reserva.caucao ?? "NAO_PAGA");
  const [valorCaucao, setValorCaucao] = useState<string>(reserva.valorCaucao ? String(reserva.valorCaucao) : "");
  const [descontoPercentagem, setDescontoPercentagem] = useState<string>(
    reserva.descontoPercentagem ? String(reserva.descontoPercentagem) : ""
  );
  const [descontoMotivo, setDescontoMotivo] = useState(reserva.descontoMotivo ?? "");

  // Acertos (tab "Acertos") aplicam write-through ao valorPago no backend -
  // sincronizar o estado local para o total subir/descer em tempo real
  // (e para o "Guardar" não sobrescrever o acerto com um valor obsoleto).
  const handleAjusteAplicado = useCallback((delta: number) => {
    setValorPago((prev) => Math.max(0, (Number(prev) || 0) + delta).toFixed(2));
  }, []);
  const handleTotalRedefinido = useCallback((novoTotal: number) => {
    setValorPago(novoTotal.toFixed(2));
  }, []);

  const sugeridoInicial = calcularSugeridoFesta(reserva, Number(descontoPercentagem) || 0);
  useEffect(() => {
    if (!reserva.valorPago && sugeridoInicial && sugeridoInicial.sugerido > 0) {
      setValorPago(sugeridoInicial.sugerido.toFixed(2));
    }
  }, [reserva.valorPago, sugeridoInicial]);

  const total = Number(valorPago) || 0;
  const caucaoValor = caucao === "PAGA" || caucao === "PAGA_NO_DIA" ? Number(valorCaucao) || 0 : 0;
  const segundo = showSplit ? Number(valorPago2) || 0 : 0;
  const emFalta = Math.max(total - caucaoValor - segundo, 0);

  const handleSave = useCallback(async () => {
    const parseNum = (s: string) => (s === "" ? undefined : Number(s));
    // "Não definido" deve LIMPAR o método guardado - null (não undefined),
    // porque undefined = "sem alterações" no Prisma e deixaria o método antigo.
    const parseMetodo = (s: string): MetodoPagamento | null =>
      s === "NONE" || s === "" ? null : (s as MetodoPagamento);

    try {
      await updatePagamento.mutateAsync({
        id: reserva.id,
        data: {
          pago,
          metodoPagamento: parseMetodo(metodoPagamento),
          valorPago: parseNum(valorPago),
          referenciaPagamento: referenciaPagamento || undefined,
          metodoPagamento2: showSplit ? parseMetodo(metodoPagamento2) : null,
          valorPago2: showSplit ? parseNum(valorPago2) ?? null : null,
          caucao: caucao || undefined,
          valorCaucao: parseNum(valorCaucao),
          descontoPercentagem: parseNum(descontoPercentagem),
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
    pago,
    metodoPagamento,
    valorPago,
    referenciaPagamento,
    showSplit,
    metodoPagamento2,
    valorPago2,
    caucao,
    valorCaucao,
    descontoPercentagem,
    descontoMotivo,
    toast,
    onClose,
  ]);

  const anvNome = reserva.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || reserva.cliente?.nome || "-";
  const metodoLabel =
    metodoPagamento !== "NONE" ? METODO_PAGAMENTO_OPTIONS.find((o) => o.value === metodoPagamento)?.label : undefined;
  const cacifoNotas = (reserva.cacifos ?? []).filter((c) => c.notas?.trim());
  const temAvisos = Boolean(reserva.notasCacifos || reserva.observacoesLesoes || cacifoNotas.length > 0);

  const heroDireita =
    total > 0 ? (
      emFalta > 0 ? (
        <span className="text-sm font-bold text-accent-orange-700 shrink-0">
          Falta liquidar {fmtEuro.format(emFalta)}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-accent-green-700 shrink-0">
          <CheckCircle2 size={15} /> Liquidado
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
    total > 0 ? (
      <>
        Total <span className="font-semibold text-text-secondary">{fmtEuro.format(total)}</span>
        {caucaoValor > 0 && <> · −{fmtEuro.format(caucaoValor)} caução</>}
        {segundo > 0 && <> · −{fmtEuro.format(segundo)} 2º pag.</>}
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
          <PagamentoEstadoRow pago={pago} onChange={setPago} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Valor a Pagar (€)</label>
              <InputField
                type="number"
                step={0.01}
                min={0}
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <PagamentoMetodoField value={metodoPagamento} onChange={setMetodoPagamento} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Referência de Pagamento</label>
            <InputField
              value={referenciaPagamento}
              onChange={(e) => setReferenciaPagamento(e.target.value)}
              placeholder="Ex: ref. MBWAY, transferência..."
            />
          </div>
          <PagamentoSplitSection
            show={showSplit}
            onToggle={setShowSplit}
            metodo2={metodoPagamento2}
            setMetodo2={setMetodoPagamento2}
            valor2={valorPago2}
            setValor2={setValorPago2}
          />
          <PagamentoSugeridoBox
            reserva={reserva}
            descontoPercentagem={Number(descontoPercentagem) || 0}
            onUsarSugerido={(v) => setValorPago(v.toFixed(2))}
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
      pago={pago}
      metodoLabel={metodoLabel}
      heroDireita={heroDireita}
      avisos={avisos}
      tabs={tabs}
      resumo={resumo}
    />
  );
}
