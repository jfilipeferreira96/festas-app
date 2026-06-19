"use client";

import React, { useState, useEffect, useCallback } from "react";
import { BadgeEuro, Save, PartyPopper, DoorOpen, Timer, Info } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/button/Button";
import InputField from "@/components/form/input/InputField";
import { useConfigPreco, useAtualizarConfigPreco } from "@/hooks/use-precos";
import { useToast } from "@/hooks/use-toast";

export default function ConfigPrecosContent() {
  const { data: config, isLoading } = useConfigPreco();
  const updateMutation = useAtualizarConfigPreco();
  const { success, error } = useToast();

  const [precoFestaSemana, setPrecoFestaSemana] = useState("");
  const [precoFestaFimSemana, setPrecoFestaFimSemana] = useState("");
  const [precoEntradaHoraSemana, setPrecoEntradaHoraSemana] = useState("");
  const [precoEntradaHoraFimSemana, setPrecoEntradaHoraFimSemana] = useState("");
  const [precoExcessoFixo, setPrecoExcessoFixo] = useState("");

  useEffect(() => {
    if (config) {
      setPrecoFestaSemana(String(Number(config.precoFestaSemana)));
      setPrecoFestaFimSemana(String(Number(config.precoFestaFimSemana)));
      setPrecoEntradaHoraSemana(String(Number(config.precoEntradaHoraSemana)));
      setPrecoEntradaHoraFimSemana(String(Number(config.precoEntradaHoraFimSemana)));
      setPrecoExcessoFixo(String(Number(config.precoExcessoFixo)));
    }
  }, [config]);

  const handleSave = useCallback(async () => {
    try {
      await updateMutation.mutateAsync({
        precoFestaSemana: parseFloat(precoFestaSemana) || 0,
        precoFestaFimSemana: parseFloat(precoFestaFimSemana) || 0,
        precoEntradaHoraSemana: parseFloat(precoEntradaHoraSemana) || 0,
        precoEntradaHoraFimSemana: parseFloat(precoEntradaHoraFimSemana) || 0,
        precoExcessoFixo: parseFloat(precoExcessoFixo) || 0,
      });
      success("Tarifário atualizado com sucesso");
    } catch {
      error("Erro ao atualizar tarifário");
    }
  }, [precoFestaSemana, precoFestaFimSemana, precoEntradaHoraSemana, precoEntradaHoraFimSemana, precoExcessoFixo, updateMutation, success, error]);

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
          Estes preços são usados como <strong>sugestão automática</strong> nos formulários de festa e entrada livre.
          Ao criar uma reserva ou entrada, o preço é pré-preenchido conforme o dia da semana, mas pode ser ajustado manualmente.
        </p>
      </div>

      {/* Festas card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-orange-100 flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-accent-orange-600" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold text-text-primary">Festas</h3>
            <p className="text-xs text-text-muted">Preço fixo por festa (pacote completo)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Dia de semana (2ª a 6ª)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoFestaSemana}
                onChange={(e) => setPrecoFestaSemana(e.target.value)}
                placeholder="150"
                className="pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Fim de semana (sábado e domingo)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoFestaFimSemana}
                onChange={(e) => setPrecoFestaFimSemana(e.target.value)}
                placeholder="200"
                className="pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
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
            <p className="text-xs text-text-muted">Preço por hora (calculado conforme a duração)</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Dia de semana (2ª a 6ª) — por hora
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoEntradaHoraSemana}
                onChange={(e) => setPrecoEntradaHoraSemana(e.target.value)}
                placeholder="10"
                className="pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€/h</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Fim de semana (sábado e domingo) — por hora
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoEntradaHoraFimSemana}
                onChange={(e) => setPrecoEntradaHoraFimSemana(e.target.value)}
                placeholder="12"
                className="pr-12"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Excesso de Tempo card */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent-orange-100 flex items-center justify-center">
            <Timer className="w-5 h-5 text-accent-orange-600" />
          </div>
          <div>
            <h3 className="font-poppins text-lg font-semibold text-text-primary">Excesso de Tempo</h3>
            <p className="text-xs text-text-muted">Valor sugerido ao concluir festas/entradas com atraso</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Preço de excesso (fixo)
            </label>
            <div className="relative">
              <InputField
                type="number"
                min="0"
                step={0.01}
                value={precoExcessoFixo}
                onChange={(e) => setPrecoExcessoFixo(e.target.value)}
                placeholder="5"
                className="pr-8"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-text-muted">€</span>
            </div>
          </div>
          <div className="sm:col-span-1 flex items-end">
            <p className="text-xs text-text-muted leading-relaxed">
              Quando uma festa ou entrada livre ultrapassa o tempo previsto, este valor é usado como
              <strong> sugestão </strong>no resumo de conclusão. O utilizador pode ajustá-lo livremente (incluindo 0 €).
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          startIcon={<Save className="w-4 h-4" />}
          onClick={handleSave}
          loading={updateMutation.isPending}
        >
          Guardar tarifário
        </Button>
      </div>
    </div>
  );
}
