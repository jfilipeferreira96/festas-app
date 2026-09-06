"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
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
  /** Estimativa calculada (preço por criança × crianças faturadas). */
  estimativa?: EstimativaFestaInfo;
}

export default function PagamentoSection({ reserva, onOpenPagamento, estimativa }: PagamentoSectionProps) {
  const { setValue, watch } = useFormContext<FestaFormData>();
  const [registarPagamento, setRegistarPagamento] = useState(false);

  if (reserva) {
    const caucaoLabel = CAUCAO_OPTIONS.find((o) => o.value === reserva.caucao)?.label ?? "Não paga";
    const caucaoValor =
      reserva.valorCaucao && Number(reserva.valorCaucao) > 0 ? ` (${formatEuro(Number(reserva.valorCaucao))})` : "";
    const pagamentos = reserva.pagamentos ?? [];
    const metodos =
      pagamentos.length > 0
        ? pagamentos.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
        : "-";

    return (
      <PagamentoCard acao={<BotaoGerirPagamento onClick={onOpenPagamento} />}>
        <PagamentoResumo
          items={[
            { label: "Estado", value: reserva.pago ? "Pago" : "Por pagar", tone: reserva.pago ? "verde" : "laranja" },
            { label: "Total", value: formatEuro(Number(reserva.valorTotal ?? 0)) },
            {
              label: "Valor pago",
              value: pagamentos.length > 0 ? formatEuro(totalPago(pagamentos)) : "-",
            },
            { label: "Método", value: metodos },
            { label: "Caução", value: `${caucaoLabel}${caucaoValor}` },
          ]}
        />
      </PagamentoCard>
    );
  }

  const total = watch("totalAPagar");
  const pagamentos = (watch("pagamentos") ?? []) as PagamentoLedgerItem[];
  const totalDevido = total ?? estimativa?.estimativa ?? 0;

  return (
    <div className="space-y-3">
      <Checkbox
        checked={registarPagamento}
        onChange={setRegistarPagamento}
        label="Registar pagamento na reserva (opcional)"
      />

      {registarPagamento && (
        <PagamentoCard titulo="Pagamento & Caução">
          {/* Total a pagar (editável, pré-preenchido com a estimativa) */}
          <div>
            <FieldLabel required>Total a pagar (€)</FieldLabel>
            <div className="flex items-center gap-2">
              <InputField
                type="number"
                step={0.01}
                min={0}
                placeholder="0,00"
                autoComplete="off"
                value={total != null ? String(total) : ""}
                onChange={(e) =>
                  setValue("totalAPagar", e.target.value === "" ? undefined : Number(e.target.value), {
                    shouldDirty: true,
                  })
                }
              />
              <span className="text-xs text-text-muted whitespace-nowrap">
                ≈ {formatEuro(estimativa?.estimativa ?? 0)}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Pré-preenchido com o cálculo — editável (valor final acordado).
            </p>
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

          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <span className="text-xs font-medium text-text-secondary flex items-center gap-1 mb-2">
              <Shield size={13} className="text-text-muted" /> Caução
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-[11px] text-text-muted mt-1">
                  Sugerida da configuração de preços — editável.
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            Descontos ficam disponíveis em "Gerir pagamento" após criar a reserva.
          </p>
        </PagamentoCard>
      )}
    </div>
  );
}
