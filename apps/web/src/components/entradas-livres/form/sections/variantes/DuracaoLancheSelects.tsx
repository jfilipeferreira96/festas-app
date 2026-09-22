"use client";

import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import type { EntradaLivreFormData } from "../../entrada-livre-form.schema";

interface DuracaoLancheSelectsProps {
  precoLancheEntrada: number;
  precoAdulto: number;
  precoMeias: number;
  numCriancas: number;
}

/**
 * OPÇÃO C - Tudo em Selects.
 * Sem toggles: Lanche (Não incluído/Incluído), Adultos (0-N) e Meias (0-N)
 * são selects numéricos - a mesma linguagem visual da Duração e do Cacifo.
 */
export default function DuracaoLancheSelects({
  precoLancheEntrada,
  precoAdulto,
  precoMeias,
}: DuracaoLancheSelectsProps) {
  const { watch, setValue } = useFormContext<EntradaLivreFormData>();
  const temLanche = !!watch("temLanche");
  const numAdultos = watch("numAdultos") ?? 0;
  const meias = watch("meiasQuantidade") ?? 0;

  // Máximos elásticos: em edição com valores acima do padrão, as opções acompanham.
  const adultosMax = Math.max(2, numAdultos);
  const meiasMax = Math.max(10, meias);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <FieldLabel>Lanche</FieldLabel>
        <Select
          options={[
            { value: "nao", label: "Não incluído" },
            { value: "sim", label: `Incluído (+${formatEuro(precoLancheEntrada)}/criança)` },
          ]}
          value={temLanche ? "sim" : "nao"}
          onChange={(val) => setValue("temLanche", val === "sim", { shouldDirty: true })}
        />
        {temLanche && (
          <p className="mt-1 text-[11px] text-text-muted">
            Marcar as crianças com lanche na secção Pessoas.
          </p>
        )}
      </div>

      <div>
        <FieldLabel>Adultos</FieldLabel>
        <Select
          options={Array.from({ length: adultosMax + 1 }, (_, n) => ({
            value: String(n),
            label: String(n),
          }))}
          value={String(numAdultos)}
          onChange={(val) => setValue("numAdultos", Number(val), { shouldDirty: true })}
        />
        {precoAdulto > 0 && (
          <p className="mt-1 text-[11px] text-text-muted">+{formatEuro(precoAdulto)}/adulto</p>
        )}
      </div>

      <div>
        <FieldLabel>Meias</FieldLabel>
        <Select
          options={Array.from({ length: meiasMax + 1 }, (_, n) => ({
            value: String(n),
            label: String(n),
          }))}
          value={String(meias)}
          onChange={(val) => setValue("meiasQuantidade", Number(val), { shouldDirty: true })}
        />
        <p className="mt-1 text-[11px] text-text-muted">
          {formatEuro(precoMeias)}/par - obrigatórias
        </p>
      </div>
    </div>
  );
}
