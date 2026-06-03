"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useCriarEntradaLivre } from "@/hooks/use-entrada-livre";
import { useEntradasLivresConfiguracoes } from "@/hooks/use-entrada-livre";
import { useLocais } from "@/hooks/use-locais";
import { useCacifos } from "@/hooks/use-cacifos";
import { useExtras } from "@/hooks/use-extras";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

interface EntradaLivreFormProps {
  entrada?: EntradaLivre | null;
  onClose: () => void;
}

const DURACAO_OPTIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hora" },
  { value: 90, label: "1h 30min" },
  { value: 120, label: "2 horas" },
  { value: 180, label: "3 horas" },
];

const METODO_PAGAMENTO_OPTIONS = [
  { value: "", label: "Selecionar..." },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "MULTIBANCO", label: "Multibanco" },
  { value: "MBWAY", label: "MB WAY" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CARTAO", label: "Cartão" },
];

export default function EntradaLivreForm({ entrada, onClose }: EntradaLivreFormProps) {
  const isEdit = !!entrada;
  const criar = useCriarEntradaLivre();

  const { data: configuracoes } = useEntradasLivresConfiguracoes();
  const { data: locais } = useLocais();
  const { data: cacifosData } = useCacifos();
  const { data: extras } = useExtras();

  const cacifosLivres = useMemo(
    () => (Array.isArray(cacifosData) ? cacifosData : (cacifosData as any)?.items ?? []).filter((c: any) => c.estado === "LIVRE"),
    [cacifosData]
  );

  // Form state
  const [criancas, setCriancas] = useState<Array<{ nome: string; idade: string }>>(
    entrada?.criancas?.map((c: any) => ({ nome: c.nome, idade: c.idade?.toString() ?? "" })) ?? [{ nome: "", idade: "" }]
  );
  const [encarregadoNome, setEncarregadoNome] = useState(entrada?.encarregadoNome ?? "");
  const [encarregadoTelefone, setEncarregadoTelefone] = useState(entrada?.encarregadoTelefone ?? "");
  const [encarregadoEmail, setEncarregadoEmail] = useState(entrada?.encarregadoEmail ?? "");
  const [localId, setLocalId] = useState(entrada?.localId ?? "");
  const [duracaoMinutos, setDuracaoMinutos] = useState(entrada?.duracaoMinutos?.toString() ?? "60");
  const [metodoPagamento, setMetodoPagamento] = useState(entrada?.metodoPagamento ?? "");
  const [pago, setPago] = useState(entrada?.pago ?? false);
  const [cacifoId, setCacifoId] = useState(entrada?.cacifoId ?? "");
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [observacoes, setObservacoes] = useState(entrada?.observacoes ?? "");
  const [observacoesLesoes, setObservacoesLesoes] = useState(entrada?.observacoesLesoes ?? "");

  // Calculate estimated cost
  const config = configuracoes?.find((c: any) => c.localId === localId);
  const custoEstimado = useMemo(() => {
    if (!config) return null;
    return (config.precoHora / 60) * parseInt(duracaoMinutos || "0");
  }, [config, duracaoMinutos]);

  const addCrianca = useCallback(() => {
    setCriancas((prev) => [...prev, { nome: "", idade: "" }]);
  }, []);

  const removeCrianca = useCallback((index: number) => {
    setCriancas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCrianca = useCallback((index: number, field: "nome" | "idade", value: string) => {
    setCriancas((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }, []);

  const toggleExtra = useCallback((extraId: string) => {
    setSelectedExtras((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        await criar.mutateAsync({
          criancas: criancas
            .filter((c) => c.nome.trim())
            .map((c) => ({
              nome: c.nome.trim(),
              idade: c.idade ? parseInt(c.idade) : undefined,
            })),
          encarregadoNome,
          encarregadoTelefone,
          encarregadoEmail: encarregadoEmail || undefined,
          localId,
          duracaoMinutos: parseInt(duracaoMinutos),
          metodoPagamento: metodoPagamento || undefined,
          pago,
          cacifoId: cacifoId || undefined,
          extrasIds: selectedExtras.length > 0 ? selectedExtras : undefined,
          observacoes: observacoes || undefined,
          observacoesLesoes: observacoesLesoes || undefined,
        });
        onClose();
      } catch {
        // Error handled by mutation
      }
    },
    [criancas, encarregadoNome, encarregadoTelefone, encarregadoEmail, localId, duracaoMinutos, metodoPagamento, pago, cacifoId, selectedExtras, observacoes, observacoesLesoes, criar, onClose]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Dados da Criança */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Dados da Criança</h3>
        <div className="space-y-2">
          {criancas.map((crianca, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nome *"
                value={crianca.nome}
                onChange={(e) => updateCrianca(index, "nome", e.target.value)}
                required
                className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              <input
                type="number"
                placeholder="Idade"
                value={crianca.idade}
                onChange={(e) => updateCrianca(index, "idade", e.target.value)}
                min={0}
                max={18}
                className="w-20 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
              {criancas.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCrianca(index)}
                  className="p-2 text-accent-red-500 hover:bg-accent-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addCrianca}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
          >
            <Plus size={14} /> Adicionar criança
          </button>
        </div>
      </div>

      {/* Dados do Encarregado */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Dados do Encarregado</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Nome *"
            value={encarregadoNome}
            onChange={(e) => setEncarregadoNome(e.target.value)}
            required
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <input
            type="tel"
            placeholder="Telefone *"
            value={encarregadoTelefone}
            onChange={(e) => setEncarregadoTelefone(e.target.value)}
            required
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <input
            type="email"
            placeholder="Email (opcional)"
            value={encarregadoEmail}
            onChange={(e) => setEncarregadoEmail(e.target.value)}
            className="sm:col-span-2 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Configuração */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Configuração</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={localId}
            onChange={(e) => setLocalId(e.target.value)}
            required
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="">Selecionar local *</option>
            {locais?.map?.((l: any) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            )) ?? (locais as any)?.items?.map((l: any) => (
              <option key={l.id} value={l.id}>{l.nome}</option>
            ))}
          </select>
          <select
            value={duracaoMinutos}
            onChange={(e) => setDuracaoMinutos(e.target.value)}
            required
            className="px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            {DURACAO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {localId && !config && (
          <p className="text-xs text-accent-red-500 mt-1">Sem configuração de preço para este local.</p>
        )}
        {custoEstimado != null && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-brand-50 border border-brand-100">
            <p className="text-sm font-medium text-brand-600">
              Custo estimado: {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(custoEstimado)}
              <span className="text-xs text-text-muted ml-1">
                ({duracaoMinutos} min × {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(config!.precoHora)}/h)
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Pagamento */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Pagamento</h3>
        <div className="flex items-center gap-3">
          <select
            value={metodoPagamento}
            onChange={(e) => setMetodoPagamento(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            {METODO_PAGAMENTO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
              className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500"
            />
            Pago
          </label>
        </div>
      </div>

      {/* Cacifo */}
      {cacifosLivres.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Cacifo (opcional)</h3>
          <select
            value={cacifoId}
            onChange={(e) => setCacifoId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="">Nenhum</option>
            {cacifosLivres.map((c: any) => (
              <option key={c.id} value={c.id}>#{c.numero} {c.nome ? `— ${c.nome}` : ""}</option>
            ))}
          </select>
        </div>
      )}

      {/* Extras */}
      {extras && (Array.isArray(extras) ? extras : (extras as any)?.items)?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3">Extras (opcional)</h3>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {(Array.isArray(extras) ? extras : (extras as any)?.items)?.map((extra: any) => (
              <label key={extra.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedExtras.includes(extra.id)}
                  onChange={() => toggleExtra(extra.id)}
                  className="w-4 h-4 rounded border-border text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-text-primary">{extra.nome}</span>
                {extra.precoUnitario != null && (
                  <span className="text-xs text-text-muted ml-auto">
                    {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(extra.precoUnitario)}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-3">Observações</h3>
        <textarea
          placeholder="Observações gerais..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
        />
        <textarea
          placeholder="Alergias / Lesões..."
          value={observacoesLesoes}
          onChange={(e) => setObservacoesLesoes(e.target.value)}
          rows={2}
          className="w-full mt-2 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-3 border-t border-border">
        <Button variant="outline" type="button" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={criar.isPending} disabled={!localId || !encarregadoNome || !encarregadoTelefone || criancas.every((c) => !c.nome.trim())}>
          {isEdit ? "Guardar" : "Criar Entrada"}
        </Button>
      </div>
    </form>
  );
}
