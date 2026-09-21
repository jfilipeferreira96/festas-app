"use client";

import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel, METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";
import type { Reserva } from "@/lib/api/reservas";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import { totalPago, type PagamentoLedgerItem } from "@/lib/pagamento-ledger";
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

    return (
      <PagamentoCard acao={<BotaoGerirPagamento onClick={onOpenPagamento} />}>
        <PagamentoResumo
          items={[
            { label: "Caução", value: `${caucaoLabel}${caucaoValor}${caucaoMetodo}` },
            { label: "Estado", value: reserva.pago ? "Pago" : "Por pagar", tone: reserva.pago ? "verde" : "laranja" },
            { label: "Total", value: formatEuro(Number(reserva.valorTotal ?? 0)) },
            {
              label: "Valor pago",
              value: pagamentos.length > 0 ? formatEuro(totalPago(pagamentos)) : "-",
            },
            { label: "Método", value: metodos },
          ]}
        />

        {estimativa &&
          estimativa.estimativa > 0 &&
          Math.abs(estimativa.estimativa - Number(reserva.valorTotal ?? 0)) > 0.01 && (
            <p className="text-[11px] text-accent-orange-600 mt-2">
              Preço do tarifário para a composição atual: ≈{formatEuro(estimativa.estimativa)} (
              {estimativa.criancasFaturadas} crianças × {formatEuro(estimativa.precoCrianca)}) - difere do total
              acordado. Ajuste em "Gerir pagamento" para ficar com registo de auditoria.
            </p>
          )}
      </PagamentoCard>
    );
  }

  // ─── Criação ────────────────────────────────────────────────
  // Total CALCULADO (tarifário + extras) - já não existe input livre:
  // correções formais ficam nos Ajustes de pagamento após criar a reserva.
  const total = watch("totalAPagar");
  const pagamentos = (watch("pagamentos") ?? []) as PagamentoLedgerItem[];
  const totalDevido = +(total ?? (estimativa?.estimativa ?? 0) + extrasTotal).toFixed(2);
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
          A caução marca-se na reserva da festa - o pagamento entra depois, no livro de pagamentos.
        </p>
      </PagamentoCard>

      <PagamentoCard titulo="Pagamento">
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
          <div className="flex justify-between font-semibold text-text-primary">
            <span>Total</span>
            <span className="tabular-nums">{formatEuro(totalDevido)}</span>
          </div>
        </div>

        {/* Ledger de pagamentos: adicionar até completar o total; pago é derivado */}
        <PagamentosLedgerSection
          totalDevido={totalDevido}
          pagamentos={pagamentos}
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

        <p className="text-[11px] text-text-muted">
          Descontos ficam disponíveis em "Gerir pagamento" após criar a reserva.
        </p>
      </PagamentoCard>
    </div>
  );
}
