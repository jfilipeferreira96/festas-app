"use client";

import { Gift, Shirt, User } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { formatEuro } from "@/lib/format";
import type { EntradaLivreFormData } from "../../entrada-livre-form.schema";

interface DuracaoLancheCartoesProps {
  precoLancheEntrada: number;
  precoAdulto: number;
  precoMeias: number;
  numCriancas: number;
}

/**
 * OPÇÃO A - Cartões seleccionáveis.
 * Mesmo padrão visual dos botões de Extras do próprio form: cartão com
 * título + preço, borda destacada quando activo. Um clique liga/desliga.
 */
export default function DuracaoLancheCartoes({
  precoLancheEntrada,
  precoAdulto,
  precoMeias,
}: DuracaoLancheCartoesProps) {
  const { watch, setValue } = useFormContext<EntradaLivreFormData>();
  const temLanche = !!watch("temLanche");
  const numAdultos = watch("numAdultos") ?? 0;
  const meias = watch("meiasQuantidade") ?? 0;

  const base =
    "flex flex-col items-start gap-1.5 px-4 py-3 rounded-lg border transition-colors text-left";
  const activo = "border-primary-300 bg-primary-50/50";
  const inactivo = "border-border hover:border-gray-300";
  const stepperBtn =
    "w-7 h-7 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Lanche */}
      <button
        type="button"
        onClick={() => setValue("temLanche", !temLanche, { shouldDirty: true })}
        className={`${base} ${temLanche ? activo : inactivo}`}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <Gift size={14} className={temLanche ? "text-brand-500" : "text-text-muted"} /> Lanche
        </span>
        <span className="text-xs text-text-secondary">
          +{formatEuro(precoLancheEntrada)}/criança
        </span>
        <span className={`text-[11px] font-medium ${temLanche ? "text-brand-600" : "text-text-muted"}`}>
          {temLanche ? "Incluído - marcar por criança" : "Não incluído"}
        </span>
      </button>

      {/* Adulto */}
      <button
        type="button"
        onClick={() => setValue("numAdultos", numAdultos > 0 ? 0 : 1, { shouldDirty: true })}
        className={`${base} ${numAdultos > 0 ? activo : inactivo}`}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <User size={14} className={numAdultos > 0 ? "text-brand-500" : "text-text-muted"} /> Adulto
        </span>
        <span className="text-xs text-text-secondary">+{formatEuro(precoAdulto)}/adulto</span>
        <span className={`text-[11px] font-medium ${numAdultos > 0 ? "text-brand-600" : "text-text-muted"}`}>
          {numAdultos > 0 ? "Acompanha e paga entrada" : "Sem adulto"}
        </span>
      </button>

      {/* Meias - card INTEIRO clicável (div + onClick, porque não podem existir
          botões aninhados com o stepper). Os botões −/+ fazem stopPropagation
          para não dispararem o toggle do card. */}
      <div
        role="button"
        tabIndex={0}
        aria-pressed={meias > 0}
        onClick={() => setValue("meiasQuantidade", meias > 0 ? 0 : 1, { shouldDirty: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setValue("meiasQuantidade", meias > 0 ? 0 : 1, { shouldDirty: true });
          }
        }}
        className={`${base} cursor-pointer ${meias > 0 ? activo : inactivo}`}
      >
        <span className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <Shirt size={14} className={meias > 0 ? "text-brand-500" : "text-text-muted"} /> Meias
        </span>
        <span className="text-xs text-text-secondary">{formatEuro(precoMeias)}/par</span>
        {meias > 0 ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setValue("meiasQuantidade", Math.max(0, meias - 1), { shouldDirty: true });
              }}
              className={stepperBtn}
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-medium text-text-primary">{meias}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setValue("meiasQuantidade", meias + 1, { shouldDirty: true });
              }}
              className={stepperBtn}
            >
              +
            </button>
          </div>
        ) : (
          <span className="text-[11px] font-medium text-text-muted">Toque para adicionar</span>
        )}
      </div>
    </div>
  );
}
