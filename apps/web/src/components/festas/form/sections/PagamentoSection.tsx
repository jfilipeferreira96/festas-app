"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { ArrowUpDown, CreditCard } from "lucide-react";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel, METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";
import type { Reserva } from "@/lib/api/reservas";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import InlineTabs from "@/components/shared/pagamento/InlineTabs";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import AcertosLocaisSection, { type AcertoLocal } from "@/components/shared/pagamento/AcertosLocaisSection";
import {
  EPS,
  faltaPagar,
  totalPago,
  comCaucaoNoLedger,
  type PagamentoLedgerItem,
} from "@/lib/pagamento-ledger";
import {
  CAUCAO_OPTIONS,
  type EstimativaFestaInfo,
  type FestaFormData,
  type FestaFormCaucao,
} from "../festa-form.schema";

interface PagamentoSectionProps {
  reserva?: Reserva | null;
  onOpenPagamento: () => void;
  /** Estimativa calculada (preço por criança × crianças faturadas + adultos). */
  estimativa?: EstimativaFestaInfo;
  /** Custo dos extras seleccionados (bolos, suplementos, diversão). */
  extrasTotal: number;
}

export default function PagamentoSection({
  reserva,
  onOpenPagamento,
  estimativa,
  extrasTotal,
}: PagamentoSectionProps) {
  const { setValue, watch } = useFormContext<FestaFormData>();
  // Data estável para a linha sintetizada da caução (criação).
  const [caucaoNoLedgerEm] = useState(() => new Date().toISOString());

  if (reserva) {
    const caucaoLabel = CAUCAO_OPTIONS.find((o) => o.value === reserva.caucao)?.label ?? "Não paga";
    const caucaoValor =
      reserva.valorCaucao && Number(reserva.valorCaucao) > 0 ? ` (${formatEuro(Number(reserva.valorCaucao))})` : "";
    const caucaoMetodo = reserva.metodoCaucao ? ` · ${metodoPagamentoLabel(reserva.metodoCaucao)}` : "";
    const pagamentos = reserva.pagamentos ?? [];
    const metodos =
      pagamentos.length > 0
        ? pagamentos.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
        : "-";
    // Mesma matemática da modal de pagamento: `pago` derivado da soma do
    // ledger (que inclui a linha "Caução") contra o total acordado.
    const totalAcordado = Number(reserva.valorTotal ?? 0);
    const falta = faltaPagar(totalAcordado, pagamentos);
    const liquidado = falta <= EPS && totalAcordado > 0;

    return (
      <PagamentoCard acao={<BotaoGerirPagamento onClick={onOpenPagamento} />}>
        <InlineTabs
          ariaLabel="Pagamento da festa"
          tabs={[
            {
              id: "pagamento",
              label: "Pagamento",
              icon: CreditCard,
              content: (
                <>
                  <PagamentoResumo
                    items={[
                      { label: "Caução", value: `${caucaoLabel}${caucaoValor}${caucaoMetodo}` },
                      {
                        label: "Estado",
                        value: liquidado ? "Pago" : "Por pagar",
                        tone: liquidado ? "verde" : "laranja",
                      },
                      { label: "Total a pagar", value: formatEuro(totalAcordado) },
                      { label: "Valor pago", value: formatEuro(totalPago(pagamentos)) },
                      ...(falta > 0
                        ? [{ label: "Falta", value: formatEuro(falta), tone: "laranja" as const }]
                        : []),
                      { label: "Método", value: metodos },
                    ]}
                  />

                  {estimativa &&
                    estimativa.estimativa > 0 &&
                    Math.abs(estimativa.estimativa - Number(reserva.valorTotal ?? 0)) > 0.01 && (
                      <p className="text-[11px] text-accent-orange-600 mt-2">
                        Preço do tarifário para a composição atual: ≈{formatEuro(estimativa.estimativa)} (
                        {estimativa.criancasFaturadas} crianças × {formatEuro(estimativa.precoCrianca)}) - difere do
                        total acordado. Ajuste na tab "Acertos" para ficar com registo de auditoria.
                      </p>
                    )}
                </>
              ),
            },
            {
              id: "acertos",
              label: "Acertos",
              icon: ArrowUpDown,
              content: (
                <AjustesPagamentoSection
                  reservaId={reserva.id}
                  numCriancas={reserva.numCriancasConfirmadas ?? reserva.previsaoCriancas ?? null}
                />
              ),
            },
          ]}
        />
      </PagamentoCard>
    );
  }

  // ─── Criação ────────────────────────────────────────────────
  // Total CALCULADO (tarifário + extras) - já não existe input livre:
  // correções formais ficam nos Ajustes de pagamento após criar a reserva.
  const total = watch("totalAPagar");
  const pagamentos = (watch("pagamentos") ?? []) as PagamentoLedgerItem[];
  // Caução paga na criação = linha fixa no ledger (desconta a falta),
  // igual à modal de pagamento; o backend persiste-a sem duplicar.
  const ledgerEfetivo = comCaucaoNoLedger(
    pagamentos,
    {
      estado: watch("caucao"),
      valor: watch("valorCaucao") ?? 0,
      metodo: watch("metodoCaucao"),
    },
    caucaoNoLedgerEm
  );
  const totalDevido = +(total ?? (estimativa?.estimativa ?? 0) + extrasTotal).toFixed(2);
  // Acertos locais (criação): array no payload - o backend grava-os após criar
  // a reserva, com write-through no valorTotal e auditoria do autor.
  const ajustesLocais = (watch("ajustes") ?? []) as AcertoLocal[];
  const liquidoAjustes =
    Math.round(ajustesLocais.reduce((s, a) => (a.tipo === "ACRESCIMO" ? s + a.valor : s - a.valor), 0) * 100) / 100;
  const totalFinal = +(totalDevido + liquidoAjustes).toFixed(2);
  const criancasFaturadas = estimativa?.criancasFaturadas ?? 0;
  const numAdultos = watch("numAdultos") ?? 0;
  const custoAdultos =
    estimativa && criancasFaturadas >= 0 ? estimativa.estimativa - estimativa.precoCrianca * criancasFaturadas : 0;

  return (
    <div className="space-y-3">
      {/* Caução — SEMPRE visível; marca-se na reserva da festa. A lógica de
          pagamento (ledger) fica por baixo, depois da caução. */}
      <PagamentoCard titulo="Caução">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Estado</FieldLabel>
            <Select
              options={CAUCAO_OPTIONS}
              value={watch("caucao") ?? "NAO_PAGA"}
              onChange={(val) => setValue("caucao", val as FestaFormCaucao, { shouldDirty: true })}
            />
          </div>
          <div>
            <FieldLabel>Valor da Caução (€)</FieldLabel>
            <InputField
              type="number"
              step={0.01}
              min={0}
              placeholder="0,00"
              value={watch("valorCaucao") != null ? String(watch("valorCaucao")) : ""}
              onChange={(e) =>
                setValue("valorCaucao", e.target.value === "" ? undefined : Number(e.target.value), {
                  shouldDirty: true,
                })
              }
            />
          </div>
          <div>
            <FieldLabel>Método de pagamento</FieldLabel>
            <Select
              options={METODO_PAGAMENTO_OPTIONS}
              value={watch("metodoCaucao") ?? "NONE"}
              onChange={(val) => setValue("metodoCaucao", val, { shouldDirty: true })}
            />
          </div>
        </div>
        <p className="text-[11px] text-text-muted mt-2">
          Se a caução estiver marcada como paga, entra automaticamente no livro de pagamentos e desconta o que falta.
        </p>
      </PagamentoCard>

      <PagamentoCard titulo="Pagamento">
        <InlineTabs
          ariaLabel="Pagamento da nova festa"
          tabs={[
            {
              id: "pagamento",
              label: "Pagamento",
              icon: CreditCard,
              content: (
                <>
                  {/* Decomposição do total - calculado, sem input livre */}
                  <div className="text-xs space-y-1 pb-2 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">
                        Tarifário ({criancasFaturadas} crianças × {formatEuro(estimativa?.precoCrianca ?? 0)})
                      </span>
                      <span className="text-text-primary tabular-nums">
                        {formatEuro(estimativa ? estimativa.estimativa - custoAdultos : 0)}
                      </span>
                    </div>
                    {numAdultos > 0 && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Adultos acompanhantes ({numAdultos})</span>
                        <span className="text-text-primary tabular-nums">{formatEuro(custoAdultos)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Extras (bolos, diversão, suplementos)</span>
                      <span className="text-text-primary tabular-nums">{formatEuro(extrasTotal)}</span>
                    </div>
                    {liquidoAjustes !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Acertos</span>
                        <span
                          className={`text-text-primary tabular-nums ${liquidoAjustes < 0 ? "text-accent-orange-600" : ""}`}
                        >
                          {liquidoAjustes > 0 ? "+" : "−"}
                          {formatEuro(Math.abs(liquidoAjustes))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-text-primary">
                      <span>Total</span>
                      <span className="tabular-nums">{formatEuro(totalFinal)}</span>
                    </div>
                  </div>

                  {/* Ledger de pagamentos: adicionar até completar o total; pago é derivado */}
                  <PagamentosLedgerSection
                    totalDevido={totalFinal}
                    pagamentos={ledgerEfetivo}
                    onAdd={(p) =>
                      setValue(
                        "pagamentos",
                        [
                          ...pagamentos,
                          { ...p, id: `pg-${Date.now()}-${pagamentos.length}`, createdAt: new Date().toISOString() },
                        ] as PagamentoLedgerItem[],
                        { shouldDirty: true },
                      )
                    }
                    onRemove={(id) =>
                      setValue("pagamentos", pagamentos.filter((x) => x.id !== id) as PagamentoLedgerItem[], {
                        shouldDirty: true,
                      })
                    }
                  />
                </>
              ),
            },
            {
              id: "acertos",
              label: "Acertos",
              icon: ArrowUpDown,
              content: (
                <AcertosLocaisSection
                  value={ajustesLocais}
                  onChange={(next) => setValue("ajustes", next, { shouldDirty: true })}
                />
              ),
            },
          ]}
        />
      </PagamentoCard>
    </div>
  );
}
