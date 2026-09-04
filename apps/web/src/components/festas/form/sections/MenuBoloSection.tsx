"use client";

import { AlertTriangle, Cake } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import {
  BOLO_BLOQUEIA_TEMA,
  TIPO_BOLO_OPTIONS,
  type FestaFormData,
  type FestaFormTipoBolo,
} from "../festa-form.schema";

interface MenuBoloSectionProps {
  menuOptions: { value: string; label: string }[];
  menuWarning: string;
}

export default function MenuBoloSection({ menuOptions, menuWarning }: MenuBoloSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FestaFormData>();
  const bolo = watch("bolo");
  const bloqueiaTema = !bolo || BOLO_BLOQUEIA_TEMA.includes(bolo);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel>Menu</FieldLabel>
          <Select
            options={menuOptions}
            placeholder="Seleccionar menu"
            value={watch("menuId") || "NONE"}
            onChange={(val) => setValue("menuId", val === "NONE" ? "" : val, { shouldDirty: true })}
          />
          {menuWarning && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle size={12} className="text-accent-orange shrink-0" />
              <p className="text-[11px] text-accent-orange-700">{menuWarning}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Cake size={14} className="text-brand-500" /> Bolo de Aniversário
        </span>
        <div className="flex gap-4">
          <div className="flex-1">
            <FieldLabel>Tipo de Bolo</FieldLabel>
            <Select
              options={TIPO_BOLO_OPTIONS}
              placeholder="Seleccionar..."
              value={bolo ?? ""}
              onChange={(val) =>
                setValue("bolo", val === "" ? undefined : (val as FestaFormTipoBolo), { shouldDirty: true })
              }
            />
          </div>
          <div className="flex-1">
            <FieldLabel>Tema do Bolo</FieldLabel>
            <InputField
              {...register("boloTema")}
              placeholder="Ex: Frozen, Cars, Princesas..."
              disabled={bloqueiaTema}
            />
          </div>
          <div className="w-28">
            <FieldLabel>Quantidade</FieldLabel>
            <InputField
              type="number"
              min={0}
              {...register("boloQuantidade", { valueAsNumber: true })}
              placeholder="0"
              disabled={bloqueiaTema}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel required>Nº Crianças Previstas</FieldLabel>
          <InputField
            type="number"
            min={1}
            max={100}
            {...register("previsaoCriancas", { valueAsNumber: true })}
            error={!!errors.previsaoCriancas}
            hint={errors.previsaoCriancas?.message}
          />
        </div>
        <div className="flex-1">
          <FieldLabel>Nº Confirmadas</FieldLabel>
          <InputField
            type="number"
            min={0}
            max={100}
            placeholder="Opcional"
            {...register("numCriancasConfirmadas", { valueAsNumber: true })}
          />
        </div>
      </div>
    </div>
  );
}
