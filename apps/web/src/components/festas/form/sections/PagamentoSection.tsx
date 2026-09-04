"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Switch from "@/components/form/switch/Switch";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel, METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";
import type { Reserva } from "@/lib/api/reservas";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import {
  CAUCAO_OPTIONS,
  type FestaFormData,
  type FestaFormCaucao,
  type FestaFormMetodoPagamento,
} from "../festa-form.schema";

interface PagamentoSectionProps {
  reserva?: Reserva | null;
  onOpenPagamento: () => void;
}

export default function PagamentoSection({ reserva, onOpenPagamento }: PagamentoSectionProps) {
  const { register, setValue, watch } = useFormContext<FestaFormData>();
  const [registarPagamento, setRegistarPagamento] = useState(false);

  if (reserva) {
    const caucaoLabel = CAUCAO_OPTIONS.find((o) => o.value === reserva.caucao)?.label ?? "Não paga";
    const caucaoValor =
      reserva.valorCaucao && Number(reserva.valorCaucao) > 0 ? ` (${formatEuro(Number(reserva.valorCaucao))})` : "";

    return (
      <PagamentoCard acao={<BotaoGerirPagamento onClick={onOpenPagamento} />}>
        <PagamentoResumo
          items={[
            { label: "Estado", value: reserva.pago ? "Pago" : "Por pagar", tone: reserva.pago ? "verde" : "laranja" },
            { label: "Valor pago", value: reserva.valorPago ? formatEuro(Number(reserva.valorPago)) : "-" },
            {
              label: "Método",
              value: `${metodoPagamentoLabel(reserva.metodoPagamento, "-")}${
                reserva.metodoPagamento2 ? ` + ${metodoPagamentoLabel(reserva.metodoPagamento2, "")}` : ""
              }`,
            },
            { label: "Caução", value: `${caucaoLabel}${caucaoValor}` },
          ]}
        />
      </PagamentoCard>
    );
  }

  return (
    <div className="space-y-3">
      <Checkbox
        checked={registarPagamento}
        onChange={setRegistarPagamento}
        label="Registar pagamento na reserva (opcional)"
      />

      {registarPagamento && (
        <PagamentoCard titulo="Pagamento & Caução">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <span className="text-sm font-medium text-text-primary">
              {watch("pago") ? "✓ Pago" : "Por pagar"}
            </span>
            <Switch
              checked={watch("pago") ?? false}
              onChange={(checked) => setValue("pago", checked, { shouldDirty: true })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Valor a Pagar (€)</FieldLabel>
              <InputField
                type="number"
                step={0.01}
                min={0}
                placeholder="0,00"
                {...register("valorPago", { valueAsNumber: true })}
              />
              <p className="text-[11px] text-text-muted mt-1">
                Estimado: preço por criança × nº de crianças — editável.
              </p>
            </div>
            <div>
              <FieldLabel>Método de Pagamento</FieldLabel>
              <Select
                options={METODO_PAGAMENTO_OPTIONS}
                value={watch("metodoPagamento") ?? "NONE"}
                onChange={(val) =>
                  setValue(
                    "metodoPagamento",
                    val === "NONE" ? undefined : (val as FestaFormMetodoPagamento),
                    { shouldDirty: true }
                  )
                }
                placeholder="Seleccionar..."
              />
            </div>
          </div>

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
            Referência, pagamento dividido e descontos ficam disponíveis em "Gerir pagamento" após criar a reserva.
          </p>
        </PagamentoCard>
      )}
    </div>
  );
}
