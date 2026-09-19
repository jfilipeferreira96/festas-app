"use client";

import { useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronDown, ChevronRight, Gift } from "lucide-react";
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
  const [aberto, setAberto] = useState(false);

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
      {/* Colapsável com seta (pedido do cliente, 19/09/2026): os extras só
          aparecem quando a seta é aberta. Abre automaticamente se já houver
          extras selecionados (edição). */}
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-text-primary hover:text-brand-500 transition-colors"
      >
        {aberto || extrasIds.length > 0 ? (
          <ChevronDown size={14} className="text-text-muted" />
        ) : (
          <ChevronRight size={14} className="text-text-muted" />
        )}
        <Gift size={14} className="text-text-muted" /> Extras
        {extrasIds.length > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 text-[10px] font-semibold">
            {extrasIds.length}
          </span>
        )}
      </button>
      {(aberto || extrasIds.length > 0) && (
        <>
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
              <span className="font-semibold">Extras: {formatEuro(totalExtras)}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}
