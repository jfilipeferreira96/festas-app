"use client";

import { Clock, Package, Users } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import Switch from "@/components/form/switch/Switch";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { DURACAO_ENTRADA_OPTIONS, type EntradaLivreFormData } from "../entrada-livre-form.schema";

interface DuracaoLancheSectionProps {
  custoTempoPorPessoa: number;
  precoLancheEntrada: number;
  precoAdulto: number;
  precoMeias: number;
  cacifoOptions: { value: string; label: string }[];
}

export default function DuracaoLancheSection({
  custoTempoPorPessoa,
  precoLancheEntrada,
  precoAdulto,
  precoMeias,
  cacifoOptions,
}: DuracaoLancheSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<EntradaLivreFormData>();
  const duracao = watch("duracaoMinutos");
  const temLanche = watch("temLanche");
  const numAdultos = watch("numAdultos") ?? 0;
  const cacifoId = watch("cacifoId");
  const numMeias = watch("meiasQuantidade") ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel required className="flex items-center gap-1">
            <Clock size={12} /> Duração
          </FieldLabel>
          <Select
            options={DURACAO_ENTRADA_OPTIONS}
            placeholder="Seleccionar"
            value={String(duracao)}
            onChange={(val) => setValue("duracaoMinutos", Number(val), { shouldValidate: true, shouldDirty: true })}
            error={!!errors.duracaoMinutos}
          />
          {errors.duracaoMinutos && (
            <p className="mt-1 text-xs text-error-500">{errors.duracaoMinutos.message}</p>
          )}
        </div>
        <div className="flex-1">
          <FieldLabel>Valor por pessoa</FieldLabel>
          <div className="h-11 flex items-center px-4 rounded-lg border border-border bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-text-primary">
            {formatEuro(custoTempoPorPessoa)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Users size={14} className="text-brand-500" /> Lanche e Acompanhantes
        </span>
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-sm font-medium text-text-primary">Inclui lanche?</span>
            <p className="text-xs text-text-muted">+{formatEuro(precoLancheEntrada)} por criança (marcar por criança acima)</p>
          </div>
          <Switch
            checked={temLanche}
            onChange={(checked) => setValue("temLanche", checked, { shouldDirty: true })}
          />
        </div>
        {temLanche && (
          <div className="w-40">
            <FieldLabel>Hora do lanche</FieldLabel>
            <InputField type="time" {...register("horaLanche")} />
          </div>
        )}
        <div className="flex items-center justify-between py-1">
          <div>
            <Checkbox
              checked={numAdultos > 0}
              onChange={(checked) => setValue("numAdultos", checked ? 1 : 0, { shouldDirty: true })}
              label="Adulto acompanha e paga entrada"
            />
            {precoAdulto > 0 && (
              <p className="text-xs text-text-muted ml-8">+{formatEuro(precoAdulto)} por adulto</p>
            )}
          </div>
        </div>
      </div>

      {/* Meias: antes da secção de pagamento (pedido do cliente, 19/09/2026).
          Incluídas no total a pagar - o stepper soma no custo final. */}
      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">Meias</span>
          <span className="text-xs text-text-muted">{formatEuro(precoMeias)} / par</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                setValue("meiasQuantidade", Math.max(0, (watch("meiasQuantidade") ?? 0) - 1), { shouldDirty: true })
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-medium text-text-primary">{numMeias}</span>
            <button
              type="button"
              onClick={() =>
                setValue("meiasQuantidade", (watch("meiasQuantidade") ?? 0) + 1, { shouldDirty: true })
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary"
            >
              +
            </button>
          </div>
          <p className="text-xs text-text-muted">Incluídas no total a pagar</p>
        </div>
      </div>

      {cacifoOptions.length > 1 && (
        <div className="space-y-2">
          <FieldLabel className="flex items-center gap-1">
            <Package size={12} /> Cacifo (opcional)
          </FieldLabel>
          <Select
            options={cacifoOptions}
            placeholder="Seleccionar cacifo"
            value={cacifoId}
            onChange={(val) => setValue("cacifoId", val, { shouldDirty: true })}
          />
        </div>
      )}
    </div>
  );
}
