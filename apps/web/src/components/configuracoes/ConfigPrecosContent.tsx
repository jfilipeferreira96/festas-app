"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BadgeEuro, Save, PartyPopper, DoorOpen, Info, ShoppingBag, Clock, Plus, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import { useConfigPreco, useAtualizarConfigPreco } from "@/hooks/use-precos";
import { useToast } from "@/hooks/use-toast";
import type { MinimoConfig } from "@/lib/api/precos";

export default function ConfigPrecosContent() {
  const { data: config, isLoading } = useConfigPreco();
  const updateMutation = useAtualizarConfigPreco();
  const { success, error } = useToast();

  const [precoCriancaSemana, setPrecoCriancaSemana] = useState("");
  const [precoCriancaFimSemana, setPrecoCriancaFimSemana] = useState("");
  const [precoEntradaHoraSemana, setPrecoEntradaHoraSemana] = useState("");
  const [precoEntradaHoraFimSemana, setPrecoEntradaHoraFimSemana] = useState("");
  const [precoEntrada1h, setPrecoEntrada1h] = useState("");
  const [precoEntrada2h, setPrecoEntrada2h] = useState("");
  const [precoEntradaHoraAdicional, setPrecoEntradaHoraAdicional] = useState("");
  const [precoExcessoFixo, setPrecoExcessoFixo] = useState("");
  const [caucaoDefault, setCaucaoDefault] = useState("");
  const [precoLancheEntrada, setPrecoLancheEntrada] = useState("");
  const [valorHoraMonitorDefault, setValorHoraMonitorDefault] = useState("");
  const [precoMeias, setPrecoMeias] = useState("");
  const [duracaoDefaultFestaMin, setDuracaoDefaultFestaMin] = useState("");
  const [minimos, setMinimos] = useState<MinimoConfig[]>([
    { aniversariantes: 1, minimo: 10 },
    { aniversariantes: 2, minimo: 15 },
    { aniversariantes: 3, minimo: 20 },
  ]);

  useEffect(() => {
    if (config) {
      setPrecoCriancaSemana(String(Number(config.precoCriancaSemana)));
      setPrecoCriancaFimSemana(String(Number(config.precoCriancaFimSemana)));
      setPrecoEntradaHoraSemana(String(Number(config.precoEntradaHoraSemana)));
      setPrecoEntradaHoraFimSemana(String(Number(config.precoEntradaHoraFimSemana)));
      setPrecoEntrada1h(String(Number(config.precoEntrada1h ?? 6)));
      setPrecoEntrada2h(String(Number(config.precoEntrada2h ?? 10)));
      setPrecoEntradaHoraAdicional(String(Number(config.precoEntradaHoraAdicional ?? 5)));
      setPrecoExcessoFixo(String(Number(config.precoExcessoFixo)));
      setCaucaoDefault(String(Number(config.caucaoDefault ?? 40)));
      setPrecoLancheEntrada(String(Number(config.precoLancheEntrada ?? 3)));
      setValorHoraMonitorDefault(config.valorHoraMonitorDefault != null ? String(Number(config.valorHoraMonitorDefault)) : "");
      setPrecoMeias(String(Number(config.precoMeias)));
      setDuracaoDefaultFestaMin(String(Number(config.duracaoDefaultFestaMin)));
      if (config.minimosCriancasPorAniversariante && config.minimosCriancasPorAniversariante.length > 0) {
        setMinimos(config.minimosCriancasPorAniversariante);
      }
    }
  }, [config]);

  const handleAddMinimo = useCallback(() => {
    setMinimos((prev) => [...prev, { aniversariantes: prev.length + 1, minimo: 10 }]);
  }, []);

  const handleRemoveMinimo = useCallback((index: number) => {
    setMinimos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleMinimoChange = useCallback((index: number, field: keyof MinimoConfig, value: number) => {
    setMinimos((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
        precoCriancaSemana: parseFloat(precoCriancaSemana) || 0,
        precoCriancaFimSemana: parseFloat(precoCriancaFimSemana) || 0,
        precoEntradaHoraSemana: parseFloat(precoEntradaHoraSemana) || 0,
        precoEntradaHoraFimSemana: parseFloat(precoEntradaHoraFimSemana) || 0,
        precoEntrada1h: parseFloat(precoEntrada1h) || 0,
        precoEntrada2h: parseFloat(precoEntrada2h) || 0,
        precoEntradaHoraAdicional: parseFloat(precoEntradaHoraAdicional) || 0,
        precoExcessoFixo: parseFloat(precoExcessoFixo) || 0,
        caucaoDefault: parseFloat(caucaoDefault) || 0,
        precoLancheEntrada: parseFloat(precoLancheEntrada) || 0,
        precoMeias: parseFloat(precoMeias) || 0,
        valorHoraMonitorDefault: valorHoraMonitorDefault ? parseFloat(valorHoraMonitorDefault) : null,
        duracaoDefaultFestaMin: parseInt(duracaoDefaultFestaMin) || 135,
        minimosCriancasPorAniversariante: minimos.sort((a, b) => a.aniversariantes - b.aniversariantes),
      });
      success("Tarifário atualizado com sucesso");
    } catch {
      error("Erro ao atualizar tarifário");
    }
  }, [precoCriancaSemana, precoCriancaFimSemana, precoEntradaHoraSemana, precoEntradaHoraFimSemana, precoEntrada1h, precoEntrada2h, precoEntradaHoraAdicional, precoExcessoFixo, caucaoDefault, precoLancheEntrada, valorHoraMonitorDefault, precoMeias, duracaoDefaultFestaMin, minimos, updateMutation, success, error]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin text-brand-500">
          <BadgeEuro className="w-8 h-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tarifário"
        subtitle="Define os preços globais para festas e entradas livres"
      />

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-900/20">
        <Info className="w-5 h-5 text-brand-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-secondary">
          O preço das festas é calculado <strong>por criança</strong>. O número mínimo de crianças faturadas
          depende do número de aniversariantes (ex.: 1 aniversariante → mínimo 10 crianças).
          Feriados e fins-de-semana usam a tarifa de fim-de-semana.
        </p>
      </div>

      {/* Festas card — preço por criança */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-orange-100 flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-accent-orange-600" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold text-text-primary">Festas — preço por criança</h3>
            <p className="text-xs text-text-muted">Valor por criança faturada (mínimo aplicado conforme aniversariantes)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Dia de semana (2ª a 6ª) — por criança
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoCriancaSemana}
                onChange={(e) => setPrecoCriancaSemana(e.target.value)}
                placeholder="15"
                className="pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€/criança</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Fim de semana e feriados — por criança
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoCriancaFimSemana}
                onChange={(e) => setPrecoCriancaFimSemana(e.target.value)}
                placeholder="20"
                className="pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€/criança</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mínimos por aniversariante card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-purple-100 flex items-center justify-center">
            <Info className="w-5 h-5 text-accent-purple-600" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold text-text-primary">Mínimos de crianças por nº de aniversariantes</h3>
            <p className="text-xs text-text-muted">Define o mínimo faturado conforme o número de aniversariantes</p>
          </div>
        </div>
        <div className="space-y-2">
          {minimos.map((m, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-text-secondary w-40 flex-shrink-0">
                {m.aniversariantes}+ aniversariante{m.aniversariantes > 1 ? "s" : ""}
              </span>
              <div className="relative w-32">
                <InputField
                  type="number"
                  min="0"
                  value={String(m.minimo)}
                  onChange={(e) => handleMinimoChange(index, "minimo", parseInt(e.target.value) || 0)}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">mín.</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveMinimo(index)}
                className="text-text-muted hover:text-error-500 transition-colors"
                aria-label="Remover linha"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddMinimo}
            className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar regra de mínimo
          </button>
        </div>
      </div>

      {/* Meias + Duração card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent-teal-100 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-accent-teal-600" />
            </div>
            <div>
              <h3 className="font-poppins text-base font-semibold text-text-primary">Meias</h3>
              <p className="text-xs text-text-muted">Compra obrigatória no parque</p>
            </div>
          </div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Preço unitário</label>
          <div className="relative">
            <InputField
              type="number"
              min="0"
              step={0.01}
              value={precoMeias}
              onChange={(e) => setPrecoMeias(e.target.value)}
              placeholder="2"
              className="pr-8"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent-orange-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-orange-600" />
            </div>
            <div>
              <h3 className="font-poppins text-base font-semibold text-text-primary">Duração default</h3>
              <p className="text-xs text-text-muted">Duração padrão de uma festa</p>
            </div>
          </div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">Duração (minutos)</label>
          <div className="relative">
            <InputField
              type="number"
              min="0"
              step={5}
              value={duracaoDefaultFestaMin}
              onChange={(e) => setDuracaoDefaultFestaMin(e.target.value)}
              placeholder="135"
              className="pr-12"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">min</span>
          </div>
        </div>
      </div>

      {/* Entradas Livres card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-teal-100 flex items-center justify-center">
            <DoorOpen className="w-5 h-5 text-accent-teal-600" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold text-text-primary">Entradas Livres</h3>
            <p className="text-xs text-text-muted">Tarifário por escalão (aplica-se a todos os dias)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              1ª hora (por pessoa)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoEntrada1h}
                onChange={(e) => setPrecoEntrada1h(e.target.value)}
                placeholder="6"
                className="pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              2 horas (por pessoa)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoEntrada2h}
                onChange={(e) => setPrecoEntrada2h(e.target.value)}
                placeholder="10"
                className="pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Hora adicional (por pessoa)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoEntradaHoraAdicional}
                onChange={(e) => setPrecoEntradaHoraAdicional(e.target.value)}
                placeholder="5"
                className="pr-10"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3">
          Ex.: 1h = 1º valor; 2h = 2º valor; 3h = 2º + hora adicional. Aplica-se a todos os dias (incluindo fins-de-semana e feriados).
        </p>
      </div>

      {/* Caução + Lanche card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-orange-100 flex items-center justify-center">
            <BadgeEuro className="w-5 h-5 text-accent-orange-600" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold text-text-primary">Caução e Lanche</h3>
            <p className="text-xs text-text-muted">Valor da caução por defeito + suplemento de lanche em entradas livres</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Valor da caução (€)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={caucaoDefault}
                onChange={(e) => setCaucaoDefault(e.target.value)}
                placeholder="40"
                className="pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Lanche entrada livre (€/pessoa)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoLancheEntrada}
                onChange={(e) => setPrecoLancheEntrada(e.target.value)}
                placeholder="3"
                className="pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Valor/hora default monitores (€/h)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={valorHoraMonitorDefault}
                onChange={(e) => setValorHoraMonitorDefault(e.target.value)}
                placeholder="8"
                className="pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "A guardar..." : "Guardar tarifário"}
        </Button>
      </div>
    </div>
  );
}
