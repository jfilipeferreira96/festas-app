"use client";

import { useFormContext } from "react-hook-form";
import Switch from "@/components/form/switch/Switch";
import { formatEuro } from "@/lib/format";
import type { EntradaLivreFormData } from "../../entrada-livre-form.schema";

interface DuracaoLancheDefinicoesProps {
  precoLancheEntrada: number;
  precoAdulto: number;
  precoMeias: number;
  numCriancas: number;
}

/**
 * OPÇÃO B - Lista de definições.
 * Cada linha = rótulo + preço à esquerda e um Switch uniforme à direita
 * (estilo lista de definições). O stepper das meias só aparece quando activo.
 */
export default function DuracaoLancheDefinicoes({
  precoLancheEntrada,
  precoAdulto,
  precoMeias,
}: DuracaoLancheDefinicoesProps) {
  const { watch, setValue } = useFormContext<EntradaLivreFormData>();
  const temLanche = !!watch("temLanche");
  const numAdultos = watch("numAdultos") ?? 0;
  const meias = watch("meiasQuantidade") ?? 0;

  const stepperBtn =
    "w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary";

  return (
    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
      {/* Lanche */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Inclui lanche?</p>
          <p className="text-xs text-text-muted">
            +{formatEuro(precoLancheEntrada)}/criança - marcar por criança na secção Pessoas
          </p>
        </div>
        <Switch
          checked={temLanche}
          onChange={(c) => setValue("temLanche", c, { shouldDirty: true })}
        />
      </div>

      {/* Adulto */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Adulto acompanha e paga entrada</p>
          <p className="text-xs text-text-muted">+{formatEuro(precoAdulto)}/adulto</p>
        </div>
        <Switch
          checked={numAdultos > 0}
          onChange={(c) => setValue("numAdultos", c ? 1 : 0, { shouldDirty: true })}
        />
      </div>

      {/* Meias */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-text-primary">Meias</p>
          <p className="text-xs text-text-muted">
            {formatEuro(precoMeias)}/par - compra obrigatória no parque
          </p>
        </div>
        <div className="flex items-center gap-3">
          {meias > 0 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setValue("meiasQuantidade", Math.max(1, meias - 1), { shouldDirty: true })
                }
                className={stepperBtn}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-medium text-text-primary">{meias}</span>
              <button
                type="button"
                onClick={() => setValue("meiasQuantidade", meias + 1, { shouldDirty: true })}
                className={stepperBtn}
              >
                +
              </button>
            </>
          )}
          <Switch
            checked={meias > 0}
            onChange={(c) =>
              setValue("meiasQuantidade", c ? Math.max(1, meias) : 0, { shouldDirty: true })
            }
          />
        </div>
      </div>
    </div>
  );
}
