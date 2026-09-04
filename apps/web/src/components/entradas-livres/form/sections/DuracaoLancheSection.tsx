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
  custoCalculado: number;
  custoTempoPorPessoa: number;
  precoLancheEntrada: number;
  cacifoOptions: { value: string; label: string }[];
  onCustoEditado: () => void;
}

export default function DuracaoLancheSection({
  custoCalculado,
  custoTempoPorPessoa,
  precoLancheEntrada,
  cacifoOptions,
  onCustoEditado,
}: DuracaoLancheSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<EntradaLivreFormData>();
  const duracao = watch("duracaoMinutos");
  const temLanche = watch("temLanche");
  const numAdultos = watch("numAdultos") ?? 0;
  const cacifoId = watch("cacifoId");

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
            onChange={(val) => setValue("duracaoMinutos", Number(val), { shouldValidate: true })}
            error={!!errors.duracaoMinutos}
          />
          {errors.duracaoMinutos && (
            <p className="mt-1 text-xs text-error-500">{errors.duracaoMinutos.message}</p>
          )}
        </div>
        <div className="flex-1">
          <FieldLabel>Custo total (€) - editável</FieldLabel>
          <div className="flex items-center gap-2">
            <InputField
              type="number"
              step={0.01}
              min={0}
              placeholder="0.00"
              value={watch("custoTotal") != null ? String(watch("custoTotal")) : ""}
              onChange={(e) => {
                const v = e.target.value;
                onCustoEditado();
                setValue("custoTotal", v === "" ? undefined : Number(v), { shouldDirty: true });
              }}
              error={!!errors.custoTotal}
              hint={errors.custoTotal?.message}
            />
            <span className="text-xs text-text-muted whitespace-nowrap">≈ {formatEuro(custoCalculado)}</span>
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
            {custoTempoPorPessoa > 0 && (
              <p className="text-xs text-text-muted ml-8">+{formatEuro(custoTempoPorPessoa)} por adulto</p>
            )}
          </div>
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
