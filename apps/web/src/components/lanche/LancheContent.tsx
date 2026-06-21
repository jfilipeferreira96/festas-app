"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Sandwich, AlertTriangle, Cake, DoorOpen, Clock, Users, MapPin, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { useLanchesDoDia, useAlergias, useAtualizarNotasLanche } from "@/hooks/use-lanche";
import type { LancheDoDia, LancheFesta, LancheEntradaLivre } from "@saas/shared-types";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDataLabel(data: string): string {
  try {
    return format(parseISO(data), "EEEE, d 'de' MMMM", { locale: pt });
  } catch {
    return data;
  }
}

export default function LancheContent() {
  const [dataSel, setDataSel] = useState<string>(todayISO());
  const [editingFesta, setEditingFesta] = useState<LancheFesta | null>(null);
  const [notasEdit, setNotasEdit] = useState("");

  const { data: lanches, isLoading } = useLanchesDoDia(dataSel);
  const { data: alergias } = useAlergias(dataSel);
  const atualizarNotas = useAtualizarNotasLanche();

  // Separar festas e entradas livres, ordenar por hora
  const { festas, entradas } = useMemo(() => {
    const f: LancheFesta[] = [];
    const e: LancheEntradaLivre[] = [];
    for (const item of lanches ?? []) {
      if (item.tipo === "FESTA") f.push(item);
      else e.push(item);
    }
    f.sort((a, b) => (a.horario ?? "").localeCompare(b.horario ?? ""));
    e.sort((a, b) => (a.inicioEm ?? "").localeCompare(b.inicioEm ?? ""));
    return { festas: f, entradas: e };
  }, [lanches]);

  const totalCriancas = useMemo(() => {
    const festasCount = festas.reduce((sum, f) => sum + (f.numCriancas || f.previsaoCriancas || 0), 0);
    const entradasCount = entradas.reduce((sum, e) => sum + (e.criancas?.length ?? 0), 0);
    return festasCount + entradasCount;
  }, [festas, entradas]);

  const handleEditNotas = useCallback((festa: LancheFesta) => {
    setEditingFesta(festa);
    setNotasEdit(festa.notasLanche ?? "");
  }, []);

  const handleSaveNotas = useCallback(async () => {
    if (!editingFesta) return;
    await atualizarNotas.mutateAsync({
      reservaId: editingFesta.reservaId,
      data: { notasLanche: notasEdit },
    });
    setEditingFesta(null);
  }, [editingFesta, notasEdit, atualizarNotas]);

  return (
    <div>
      <PageHeader
        title="Lanches do Dia"
        subtitle={formatDataLabel(dataSel)}
        actions={
          <div className="flex items-center gap-2">
            <InputField
              type="date"
              value={dataSel}
              onChange={(e) => setDataSel(e.target.value)}
              className="w-auto"
            />
          </div>
        }
      />

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-surface border border-border">
          <div className="flex items-center gap-2 text-text-muted">
            <Cake size={16} />
            <span className="text-xs uppercase tracking-wider">Festas</span>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1">{festas.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <div className="flex items-center gap-2 text-text-muted">
            <DoorOpen size={16} />
            <span className="text-xs uppercase tracking-wider">Entradas Livres</span>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1">{entradas.length}</p>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border">
          <div className="flex items-center gap-2 text-text-muted">
            <Users size={16} />
            <span className="text-xs uppercase tracking-wider">Total Crianças</span>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-1">{totalCriancas}</p>
        </div>
      </div>

      {/* Alergias / Restrições */}
      {alergias && alergias.length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-warning-50 border border-warning-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-warning-600" />
            <h3 className="text-sm font-semibold text-warning-800">Alergias e Restrições</h3>
          </div>
          <ul className="space-y-1.5">
            {alergias.map((a) => (
              <li key={a.reservaId} className="flex items-start gap-2 text-sm text-warning-900">
                <span className="font-medium">{a.nomeFesta}:</span>
                <span>{a.notasLanche || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Lista de Festas */}
      {festas.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Cake size={16} className="text-brand-500" />
            Festas
          </h3>
          <div className="space-y-3">
            {festas.map((f) => (
              <div key={f.reservaId} className="p-4 rounded-lg bg-surface border border-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{f.nomeFesta}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Clock size={12} /> {f.horario}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {f.localNome}</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {f.numCriancas || f.previsaoCriancas || "—"} crianças</span>
                    </div>
                    {f.menu && (
                      <p className="text-xs text-text-secondary mt-1.5">
                        <span className="font-medium">Menu:</span> {f.menu.nome}
                      </p>
                    )}
                    {f.notasLanche && (
                      <div className="mt-2 p-2 rounded bg-warning-50 border border-warning-200">
                        <p className="text-xs text-warning-800">{f.notasLanche}</p>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleEditNotas(f)} className="shrink-0">
                    {f.notasLanche ? "Editar" : "Notas"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de Entradas Livres */}
      {entradas.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <DoorOpen size={16} className="text-brand-500" />
            Entradas Livres
          </h3>
          <div className="space-y-3">
            {entradas.map((e) => (
              <div key={e.entradaLivreId} className="p-4 rounded-lg bg-surface border border-border">
                <p className="text-sm font-semibold text-text-primary">{e.encarregadoNome}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Clock size={12} /> {e.inicioEm ? format(parseISO(e.inicioEm), "HH:mm") : "—"}</span>
                  <span className="flex items-center gap-1"><MapPin size={12} /> {e.localNome}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {e.criancas?.length ?? 0} crianças</span>
                </div>
                {e.observacoesLesoes && (
                  <div className="mt-2 p-2 rounded bg-warning-50 border border-warning-200">
                    <p className="text-xs text-warning-800">{e.observacoesLesoes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && festas.length === 0 && entradas.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
            <Sandwich size={28} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">Sem lanches para hoje</p>
          <p className="text-xs text-text-muted mt-1">Não há festas nem entradas livres para esta data.</p>
        </div>
      )}

      {/* Modal de edição de notas */}
      {editingFesta && (
        <Modal isOpen={!!editingFesta} onClose={() => setEditingFesta(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Notas de Lanche</h2>
            <p className="text-sm text-text-muted mb-4">{editingFesta.nomeFesta}</p>
            <TextArea
              placeholder="Alergias, restrições, pedidos especiais..."
              value={notasEdit}
              onChange={(v) => setNotasEdit(v)}
              rows={4}
            />
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button variant="outline" onClick={() => setEditingFesta(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveNotas} disabled={atualizarNotas.isPending} className="flex items-center gap-2">
                <Save size={16} />
                {atualizarNotas.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
