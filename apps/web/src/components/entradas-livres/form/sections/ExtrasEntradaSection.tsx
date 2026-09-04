"use client";

import { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { Gift } from "lucide-react";
import { useExtras } from "@/hooks/use-extras";
import ExtrasQuantidadeStepper from "@/components/shared/extras/ExtrasQuantidadeStepper";
import { formatEuro } from "@/lib/format";
import { calcularCustoExtras } from "@/lib/extras-custo";
import type { Extra } from "@/lib/api/extras";
import type { EntradaLivreFormData } from "../entrada-livre-form.schema";

interface ExtrasEntradaSectionProps {
  numPessoas: number;
}

export default function ExtrasEntradaSection({ numPessoas }: ExtrasEntradaSectionProps) {
  const { data: extras } = useExtras();
  const { watch, setValue } = useFormContext<EntradaLivreFormData>();
  const extrasIds = watch("extrasIds");
  const extrasQuantidades = watch("extrasQuantidades");

  const extraItems = useMemo(
    () => (Array.isArray(extras) ? extras.filter((e: Extra) => e.categoria !== "MENU" && e.activo !== false) : []),
    [extras]
  );

  const totalExtras = useMemo(
    () =>
      calcularCustoExtras(
        extrasIds.map((id) => ({ extraId: id, quantidade: extrasQuantidades[id] ?? 1 })),
        extraItems,
        numPessoas
      ),
    [extrasIds, extrasQuantidades, extraItems, numPessoas]
  );

  const toggleExtra = (id: string) => {
    setValue(
      "extrasIds",
      extrasIds.includes(id) ? extrasIds.filter((x) => x !== id) : [...extrasIds, id],
      { shouldDirty: true }
    );
  };

  const setQuantidade = (id: string, qtd: number) => {
    setValue("extrasQuantidades", { ...extrasQuantidades, [id]: qtd }, { shouldDirty: true });
  };

  if (extraItems.length === 0) return null;

  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <Gift size={14} className="text-text-muted" /> Extras
      </span>
      <div className="flex flex-wrap gap-3">
        {extraItems.map((item) => {
          const isSelected = extrasIds.includes(item.id);
          return (
            <div key={item.id} className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => toggleExtra(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                  isSelected ? "border-primary-300 bg-primary-50/50" : "border-border hover:border-gray-300"
                }`}
              >
                <span className="text-sm text-text-primary">{item.nome}</span>
                <span className="text-xs font-medium text-text-secondary">
                  +{formatEuro(Number(item.precoUnitario))}
                  {item.baseCobranca === "POR_PESSOA" ? "/pessoa" : ""}
                </span>
              </button>
              {isSelected && (
                <ExtrasQuantidadeStepper
                  extra={item}
                  quantidade={extrasQuantidades[item.id] ?? 1}
                  numPessoas={numPessoas}
                  onChange={(qtd) => setQuantidade(item.id, qtd)}
                />
              )}
            </div>
          );
        })}
      </div>
      {extrasIds.length > 0 && totalExtras > 0 && (
        <p className="text-xs text-text-secondary">
          <span className="font-semibold">Extras: {formatEuro(totalExtras)}</span> — soma ao custo final ({numPessoas}{" "}
          {numPessoas === 1 ? "pessoa" : "pessoas"})
        </p>
      )}
    </div>
  );
}
