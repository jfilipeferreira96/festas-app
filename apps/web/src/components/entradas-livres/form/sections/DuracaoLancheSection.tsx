"use client";

import { useState } from "react";
import { Clock, Package } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { DURACAO_ENTRADA_OPTIONS, type EntradaLivreFormData } from "../entrada-livre-form.schema";
import DuracaoLancheCartoes from "./variantes/DuracaoLancheCartoes";
import DuracaoLancheDefinicoes from "./variantes/DuracaoLancheDefinicoes";
import DuracaoLancheSelects from "./variantes/DuracaoLancheSelects";

interface DuracaoLancheSectionProps {
  custoTempoPorPessoa: number;
  precoLancheEntrada: number;
  precoAdulto: number;
  precoMeias: number;
  cacifoOptions: { value: string; label: string }[];
}

type Variante = "cartoes" | "definicoes" | "selects";

const VARIANTES: { id: Variante; label: string }[] = [
  { id: "cartoes", label: "A · Cartões" },
  { id: "definicoes", label: "B · Definições" },
  { id: "selects", label: "C · Selects" },
];

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
  const cacifoId = watch("cacifoId");
  const numCriancas = (watch("criancas") ?? []).length;

  // TEMPORÁRIO (pré-visualização): selector das 3 variantes visuais pedidas
  // pelo cliente - fixar a escolhida e remover o selector quando decidir.
  const [variante, setVariante] = useState<Variante>("cartoes");

  const propsVariante = { precoLancheEntrada, precoAdulto, precoMeias, numCriancas };

  return (
    <div className="space-y-4">
      {/* Selector de variantes - TEMPORÁRIO para escolha do cliente */}
      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">Pré-visualização:</span>
        {VARIANTES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVariante(v.id)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-colors ${
              variante === v.id
                ? "bg-brand-500 text-white border-brand-500"
                : "border-border text-text-muted hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

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

      {/* Lanche / Adulto / Meias - variante visual escolhida na pré-visualização */}
      {variante === "cartoes" && <DuracaoLancheCartoes {...propsVariante} />}
      {variante === "definicoes" && <DuracaoLancheDefinicoes {...propsVariante} />}
      {variante === "selects" && <DuracaoLancheSelects {...propsVariante} />}

      {temLanche && (
        <div className="w-40">
          <FieldLabel>Hora do lanche</FieldLabel>
          <InputField type="time" {...register("horaLanche")} />
        </div>
      )}

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
