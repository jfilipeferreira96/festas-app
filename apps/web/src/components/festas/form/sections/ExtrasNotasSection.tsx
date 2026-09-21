"use client";

import { useEffect, useMemo } from "react";
import { Baby, Coins, FileText } from "lucide-react";
import { useFormContext } from "react-hook-form";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import ExtrasQuantidadeStepper from "@/components/shared/extras/ExtrasQuantidadeStepper";
import { formatEuro } from "@/lib/format";
import { calcularCustoExtras } from "@/lib/extras-custo";
import type { Extra } from "@/lib/api/extras";
import type { FestaFormData } from "../festa-form.schema";

interface ExtrasNotasSectionProps {
  extraItems: Extra[];
  /** Total de crianças (confirmadas ?? previstas ?? 1) - base de cobrança dos extras POR_PESSOA. */
  numPessoas: number;
  /** IDs a excluir da sincronização com numPessoas (ex.: bolos - quantidade própria). */
  excluirIds?: string[];
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

export default function ExtrasNotasSection({
  extraItems,
  numPessoas,
  excluirIds,
}: ExtrasNotasSectionProps) {
  const { watch, setValue } = useFormContext<FestaFormData>();
  const extrasIds = watch("extrasIds");
  const extrasTexto = watch("extrasTexto");
  const extrasQuantidades = watch("extrasQuantidades");

  // ── Separação por cobrança (21/09/2026) ──
  // POR_PESSOA → paga por criança (quantidade = nº de crianças)
  // POR_UNIDADE → por valor / total (quantidade fixa do dia, editável)
  const porPessoa = useMemo(
    () => extraItems.filter((e) => e.baseCobranca === "POR_PESSOA"),
    [extraItems]
  );
  const porValor = useMemo(
    () => extraItems.filter((e) => e.baseCobranca !== "POR_PESSOA"),
    [extraItems]
  );

  // Extras POR_PESSOA sincronizam SEMPRE com o nº de crianças. Os POR_UNIDADE
  // (e os bolos, excluídos) têm quantidade própria.
  useEffect(() => {
    if (extrasIds.length === 0) return;
    const excluidos = new Set(excluirIds ?? []);
    const sincronizaveis = extrasIds.filter((id) => {
      if (excluidos.has(id)) return false;
      const extra = porPessoa.find((e) => e.id === id);
      return !!extra;
    });
    if (sincronizaveis.length === 0) return;
    const dessincronizado = sincronizaveis.some((id) => (extrasQuantidades[id] ?? 1) !== numPessoas);
    if (!dessincronizado) return;
    const novo = { ...extrasQuantidades };
    for (const id of sincronizaveis) novo[id] = numPessoas;
    setValue("extrasQuantidades", novo, { shouldDirty: true });
  }, [extrasIds, extrasQuantidades, numPessoas, setValue, porPessoa, excluirIds]);

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

  const setTextoExtra = (id: string, texto: string) => {
    setValue("extrasTexto", { ...extrasTexto, [id]: texto }, { shouldDirty: true });
  };

  const alterarQuantidade = (id: string, qtd: number) => {
    setValue("extrasQuantidades", { ...extrasQuantidades, [id]: Math.max(1, qtd) }, { shouldDirty: true });
  };

  const renderChip = (item: Extra) => {
    const isSelected = extrasIds.includes(item.id);
    const ehPorPessoa = item.baseCobranca === "POR_PESSOA";
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
            {ehPorPessoa ? "/criança" : " (total)"}
          </span>
        </button>
        {isSelected && item.requerTexto && (
          <InputField
            value={extrasTexto[item.id] ?? ""}
            onChange={(e) => setTextoExtra(item.id, e.target.value)}
            placeholder={`Descrever ${item.nome.toLowerCase()}...`}
          />
        )}
        {isSelected && (
          <ExtrasQuantidadeStepper
            extra={item}
            quantidade={ehPorPessoa ? numPessoas : extrasQuantidades[item.id] ?? 1}
            numPessoas={numPessoas}
            onChange={(qtd) => !ehPorPessoa && alterarQuantidade(item.id, qtd)}
          />
        )}
      </div>
    );
  };

  const renderGrupo = (items: Extra[], mostrarHeaderVazio: boolean) => {
    const { grouped, ungrouped } = groupBySubcategoria(items);
    return (
      <>
        {Object.entries(grouped).map(([sub, groupItems]) => (
          <div key={sub}>
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">{sub}</p>
            <div className="flex flex-wrap gap-3">{groupItems.map(renderChip)}</div>
          </div>
        ))}
        {ungrouped.length > 0 && (
          <div>
            {Object.keys(grouped).length > 0 && mostrarHeaderVazio && (
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Outros</p>
            )}
            <div className="flex flex-wrap gap-3">{ungrouped.map(renderChip)}</div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-4">
      {porPessoa.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Baby size={13} className="text-brand-500" /> Por criança — cobrado pelo nº de crianças
          </span>
          {renderGrupo(porPessoa, false)}
        </div>
      )}

      {porValor.length > 0 && (
        <div className="space-y-3">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Coins size={13} className="text-brand-500" /> Por valor — total fixo do dia
          </span>
          {renderGrupo(porValor, true)}
        </div>
      )}

      {extrasIds.length > 0 && totalExtras > 0 && (
        <p className="text-xs text-text-secondary">
          <span className="font-semibold">Extras: {formatEuro(totalExtras)}</span> - cobrados no dia
        </p>
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
