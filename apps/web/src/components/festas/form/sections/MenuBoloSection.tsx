"use client";

import { AlertTriangle, Cake, Utensils } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import ExtrasQuantidadeStepper from "@/components/shared/extras/ExtrasQuantidadeStepper";
import { formatEuro } from "@/lib/format";
import type { Extra } from "@/lib/api/extras";
import {
  BOLO_BLOQUEIA_TEMA,
  TIPO_BOLO_OPTIONS,
  type FestaFormData,
  type FestaFormTipoBolo,
} from "../festa-form.schema";

interface MenuBoloSectionProps {
  menuOptions: { value: string; label: string }[];
  menuWarning: string;
  /** Extras de almoço/jantar (por nome) - aparecem por baixo do select Menu. */
  suplementosMenu: Extra[];
  /** Total de crianças (confirmadas ?? previstas ?? 1). */
  numPessoas: number;
}

export default function MenuBoloSection({ menuOptions, menuWarning, suplementosMenu, numPessoas }: MenuBoloSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FestaFormData>();
  const bolo = watch("bolo");
  const extrasIds = watch("extrasIds");
  const extrasQuantidades = watch("extrasQuantidades");
  const bloqueiaTema = !bolo || BOLO_BLOQUEIA_TEMA.includes(bolo);

  const toggleSuplemento = (id: string) => {
    setValue(
      "extrasIds",
      extrasIds.includes(id) ? extrasIds.filter((x) => x !== id) : [...extrasIds, id],
      { shouldDirty: true }
    );
  };

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

      {/* Suplementos de menu (Almoço/Jantar): por baixo do Menu, a pedido do
          cliente (19/09/2026). Quantidade sempre = total de crianças. */}
      {suplementosMenu.length > 0 && (
        <div className="space-y-2 pl-3 border-l-2 border-border">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Utensils size={13} className="text-brand-500" /> Almoço / Jantar
          </span>
          <div className="flex flex-wrap gap-3">
            {suplementosMenu.map((item) => {
              const isSelected = extrasIds.includes(item.id);
              return (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleSuplemento(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                      isSelected ? "border-primary-300 bg-primary-50/50" : "border-border hover:border-gray-300"
                    }`}
                  >
                    <span className="text-sm text-text-primary">{item.nome}</span>
                    <span className="text-xs font-medium text-text-secondary">
                      +{formatEuro(Number(item.precoUnitario))}
                    </span>
                  </button>
                  {isSelected && (
                    <ExtrasQuantidadeStepper
                      extra={item}
                      quantidade={numPessoas}
                      numPessoas={numPessoas}
                      quantidadeFixa
                      onChange={() => {}}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Cake size={14} className="text-brand-500" /> Bolo de Aniversário
        </span>
        <div className="flex gap-4">
          <div className="flex-1">
            <FieldLabel>Tipo de Bolo <span className="text-error-500">*</span></FieldLabel>
            <Select
              options={TIPO_BOLO_OPTIONS}
              placeholder="Seleccionar..."
              value={bolo ?? ""}
              onChange={(val) => {
                const tipo = (val || "") as FestaFormData["bolo"];
                setValue("bolo", tipo, { shouldDirty: true, shouldValidate: true });
                if (!tipo || BOLO_BLOQUEIA_TEMA.includes(tipo)) {
                  setValue("boloQuantidade", undefined, { shouldDirty: true });
                } else {
                  setValue("boloQuantidade", 1, { shouldDirty: true });
                }
              }}
              error={!!errors.bolo}
            />
            {errors.bolo && (
              <p className="mt-1 text-xs text-error-500">{errors.bolo.message}</p>
            )}
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
              min={1}
              {...register("boloQuantidade", { valueAsNumber: true })}
              placeholder="1"
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
