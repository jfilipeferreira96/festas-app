"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import type { Reserva } from "@/lib/api/reservas";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentoRegistoSection } from "@/components/shared/pagamento/PagamentoRegistoSection";
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
  /** Chamado quando o utilizador edita manualmente o "Recebi nesta fase". */
  onRecebidoEditado?: () => void;
}

export default function PagamentoSection({ reserva, onOpenPagamento, estimativa, onRecebidoEditado }: PagamentoSectionProps) {
  const { register, setValue, watch } = useFormContext<FestaFormData>();
  const [registarPagamento, setRegistarPagamento] = useState(false);
  const [split, setSplit] = useState(false);

  if (reserva) {
    const caucaoLabel = CAUCAO_OPTIONS.find((o) => o.value === reserva.caucao)?.label ?? "Não paga";
    const caucaoValor =
      reserva.valorCaucao && Number(reserva.valorCaucao) > 0 ? ` (${formatEuro(Number(reserva.valorCaucao))})` : "";

    return (
      <PagamentoCard acao={<BotaoGerirPagamento onClick={onOpenPagamento} />}>
        <PagamentoResumo
          items={[
            { label: "Estado", value: reserva.pago ? "Pago" : "Por pagar", tone: reserva.pago ? "verde" : "laranja" },
            { label: "Total", value: formatEuro(Number(reserva.valorTotal ?? reserva.valorPago ?? 0)) },
            { label: "Valor pago", value: reserva.valorPago ? formatEuro(Number(reserva.valorPago)) : "-" },
            {
              label: "Método",
              value: `${metodoResumo(reserva)}`,
            },
            { label: "Caução", value: `${caucaoLabel}${caucaoValor}` },
          ]}
        />
      </PagamentoCard>
    );
  }

  const total = watch("totalAPagar");
  const recebido1 = watch("valorRecebido1");
  const valor2 = watch("valorRecebido2") ?? 0;
  const falta = Math.max((total ?? 0) - (recebido1 ?? 0) - (split ? valor2 : 0), 0);
  const totalFinal = total ?? estimativa?.estimativa ?? 0;

  return (
    <div className="space-y-3">
      <Checkbox
        checked={registarPagamento}
        onChange={setRegistarPagamento}
        label="Registar pagamento na reserva (opcional)"
      />

      {registarPagamento && (
        <PagamentoCard titulo="Pagamento & Caução">
          <PagamentoRegistoSection
            totalValor={total}
            onTotalChange={(v) => setValue("totalAPagar", v, { shouldDirty: true })}
            totalCalculado={estimativa?.estimativa ?? 0}
            recebido1={recebido1}
            onRecebido1Change={(v) => {
              onRecebidoEditado?.();
              setValue("valorRecebido1", v, { shouldDirty: true });
            }}
            metodo1={watch("metodoPagamento")}
            onMetodo1Change={(v) => setValue("metodoPagamento", v as FestaFormData["metodoPagamento"], { shouldDirty: true })}
            split={split}
            onSplitToggle={(checked) => {
              setSplit(checked);
              if (!checked) {
                setValue("metodoPagamento2", undefined, { shouldDirty: true });
                setValue("valorRecebido2", undefined, { shouldDirty: true });
              }
            }}
            metodo2={watch("metodoPagamento2")}
            onMetodo2Change={(v) => setValue("metodoPagamento2", v as FestaFormData["metodoPagamento2"], { shouldDirty: true })}
            valor2={valor2}
            onValor2Change={(v) => setValue("valorRecebido2", v, { shouldDirty: true })}
            falta={falta}
            pago={watch("pago") ?? false}
            onPagoChange={(checked) => setValue("pago", checked, { shouldDirty: true })}
            breakdown={
              <>
                {estimativa && estimativa.precoCrianca > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">
                      Crianças ({estimativa.criancasFaturadas} × {formatEuro(estimativa.precoCrianca)}
                      {estimativa.minimoAplicavel > 0 ? ` · mín. ${estimativa.minimoAplicavel}` : ""})
                    </span>
                    <span className="text-xs text-text-secondary">{formatEuro(estimativa.estimativa)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                  <span className="text-sm font-semibold text-text-primary">Total</span>
                  <span className="text-base font-bold text-primary-500">{formatEuro(totalFinal)}</span>
                </div>
              </>
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
                  {...register("valorCaucao", { valueAsNumber: true })}
                />
                <p className="text-[11px] text-text-muted mt-1">
                  Sugerida da configuração de preços — editável.
                </p>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-text-muted">
            Referência e descontos ficam disponíveis em "Gerir pagamento" após criar a reserva.
          </p>
        </PagamentoCard>
      )}
    </div>
  );
}

function metodoResumo(reserva: Reserva): string {
  const labelDe = (m?: string | null) => {
    if (!m) return "-";
    return METODO_LABELS[m] ?? m;
  };
  const base = labelDe(reserva.metodoPagamento);
  return reserva.metodoPagamento2 ? `${base} + ${labelDe(reserva.metodoPagamento2)}` : base;
}

const METODO_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  MULTIBANCO: "Multibanco",
  MBWAY: "MB Way",
  TRANSFERENCIA: "Transferência",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};
