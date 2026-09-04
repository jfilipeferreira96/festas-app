"use client";

import { useMemo } from "react";
import { FileText } from "lucide-react";
import { useFormContext } from "react-hook-form";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { formatEuro } from "@/lib/format";
import type { Extra } from "@/lib/api/extras";
import type { FestaFormData } from "../festa-form.schema";

interface ExtrasNotasSectionProps {
  extraItems: Extra[];
}

function groupBySubcategoria(items: Extra[]) {
  const grouped: Record<string, Extra[]> = {};
  const ungrouped: Extra[] = [];
  for (const item of items) {
    const sub = item.subcategoria?.trim();
    if (sub) {
      grouped[sub] = grouped[sub] ? [...grouped[sub], item] : [item];
    } else {
      ungrouped.push(item);
    }
  }
  return { grouped, ungrouped };
}

export default function ExtrasNotasSection({ extraItems }: ExtrasNotasSectionProps) {
  const { watch, setValue } = useFormContext<FestaFormData>();
  const extrasIds = watch("extrasIds");
  const extrasTexto = watch("extrasTexto");
  const { grouped, ungrouped } = useMemo(() => groupBySubcategoria(extraItems), [extraItems]);

  const toggleExtra = (id: string) => {
    setValue(
      "extrasIds",
      extrasIds.includes(id) ? extrasIds.filter((x) => x !== id) : [...extrasIds, id],
      { shouldDirty: true }
    );
  };

  const setTextoExtra = (id: string, texto: string) => {
    setValue("extrasTexto", { ...extrasTexto, [id]: texto }, { shouldDirty: true });
  };

  const renderChip = (item: Extra) => {
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
          <span className="text-xs font-medium text-text-secondary">+{formatEuro(Number(item.precoUnitario))}</span>
        </button>
        {isSelected && item.requerTexto && (
          <InputField
            value={extrasTexto[item.id] ?? ""}
            onChange={(e) => setTextoExtra(item.id, e.target.value)}
            placeholder={`Descrever ${item.nome.toLowerCase()}...`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {extraItems.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-semibold text-text-primary block">Extras</span>
          {Object.entries(grouped).map(([sub, items]) => (
            <div key={sub}>
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">{sub}</p>
              <div className="flex flex-wrap gap-3">{items.map(renderChip)}</div>
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              {Object.keys(grouped).length > 0 && (
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Outros</p>
              )}
              <div className="flex flex-wrap gap-3">{ungrouped.map(renderChip)}</div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <span className="text-xs font-medium text-text-secondary block mb-1">Outros Extras (não listados)</span>
          <TextArea
            placeholder="Outros itens ou extras não listados acima..."
            rows={2}
            value={watch("outrosExtras")}
            onChange={(v) => setValue("outrosExtras", v)}
          />
        </div>
        <div>
          <span className="text-xs font-medium text-text-secondary block mb-1">Brindes</span>
          <TextArea
            placeholder="Informações sobre brindes, presentes..."
            rows={2}
            value={watch("observacoesBrindes")}
            onChange={(v) => setValue("observacoesBrindes", v)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <FileText size={14} className="text-text-muted" /> Notas & Observações
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-medium text-text-secondary block mb-1">Notas - Cacifos</span>
            <TextArea
              placeholder="Instruções para a equipa de cacifos (alergias, restrições, pedidos especiais)..."
              rows={2}
              value={watch("notasCacifos")}
              onChange={(v) => setValue("notasCacifos", v)}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary block mb-1">Notas - Lanche</span>
            <TextArea
              placeholder="Instruções para a equipa de lanche (alergias, restrições alimentares)..."
              rows={2}
              value={watch("notasLanche")}
              onChange={(v) => setValue("notasLanche", v)}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary block mb-1">Lesões / Alergias</span>
            <TextArea
              placeholder="Alergias alimentares, lesões, condições médicas..."
              rows={2}
              value={watch("observacoesLesoes")}
              onChange={(v) => setValue("observacoesLesoes", v)}
            />
          </div>
          <div>
            <span className="text-xs font-medium text-text-secondary block mb-1">Observações Gerais</span>
            <TextArea
              placeholder="Outras observações relevantes para a festa..."
              rows={2}
              value={watch("observacoesGerais")}
              onChange={(v) => setValue("observacoesGerais", v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
