"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Save, Clock, Pencil, CheckCircle2, AlertTriangle, History, Users, CheckCircle, XCircle, Tv, Minimize2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import TextArea from "@/components/form/input/TextArea";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { useFestasAcabar, useAtualizarFestaAcabar, useFinalizarFesta } from "@/hooks/use-festas-acabar";
import { useTVMode } from "@/hooks/use-tv-mode";
import { useReserva } from "@/hooks/use-reservas";
import type { FestaAcabar } from "@/lib/api/festasAcabar";

/** Formata minutos decorridos como HH:MM. */
function formatDecorrido(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

interface EditState {
  festa: FestaAcabar;
  brindes: string;
  brindesPais: string;
  lesoes: string;
}

export default function FestasAcabarContent() {
  const { data: festasRaw, isLoading } = useFestasAcabar();
  const atualizar = useAtualizarFestaAcabar();
  const finalizar = useFinalizarFesta();
  const { isTVMode, toggleTVMode } = useTVMode();
  const [editing, setEditing] = useState<EditState | null>(null);
  const [confirmandoFinalizar, setConfirmandoFinalizar] = useState<FestaAcabar | null>(null);
  const [historicoId, setHistoricoId] = useState<string | null>(null);

  // "Tick" a cada minuto para refrescar o tempo decorrido mostrado.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const festas = (festasRaw as unknown as FestaAcabar[]) ?? [];

  const handleConfirmarFinalizar = useCallback(async () => {
    if (!confirmandoFinalizar) return;
    await finalizar.mutateAsync(confirmandoFinalizar.id);
    setConfirmandoFinalizar(null);
  }, [confirmandoFinalizar, finalizar]);

  const handleEdit = useCallback((festa: FestaAcabar) => {
    setEditing({
      festa,
      brindes: festa.observacoesBrindes ?? "",
      brindesPais: festa.observacoesBrindesPais ?? "",
      lesoes: festa.observacoesLesoes ?? "",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    await atualizar.mutateAsync({
      reservaId: editing.festa.id,
      data: {
        observacoesBrindes: editing.brindes,
        observacoesBrindesPais: editing.brindesPais,
        observacoesLesoes: editing.lesoes,
      },
    });
    setEditing(null);
  }, [editing, atualizar]);

  const columns: Column<FestaAcabar>[] = [
    {
      key: "fimPrevisto",
      label: "Hora Saída",
      sortable: true,
      render: (_v, f) => (
        <span className="font-medium text-text-primary whitespace-nowrap flex items-center gap-1">
          <Clock size={13} className="text-text-muted" />
          {f.fimPrevisto ? format(parseISO(f.fimPrevisto), "HH:mm") : "—"}
        </span>
      ),
    },
    {
      key: "nomeFesta",
      label: "Aniversariante",
      sortable: true,
      render: (_v, f) => (
        <div className="flex items-center gap-2">
          <FestaColorDot color={f.cor} />
          <div>
            <p className="text-sm font-medium text-text-primary">{f.nomeFesta}</p>
            {f.idadeAniversariante != null && (
              <p className="text-xs text-primary-500 font-medium">{f.idadeAniversariante} anos</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "localNome",
      label: "Sala",
      render: (_v, f) => (
        <span className="text-sm text-text-secondary">{f.localNome || "—"}</span>
      ),
    },
    {
      key: "numCriancas",
      label: "Crianças",
      sortable: true,
      render: (_v, f) => (
        <span className="text-sm text-text-secondary text-center block">{f.numCriancas}</span>
      ),
    },
    {
      key: "tempo",
      label: "Tempo",
      render: (_v, f) => {
        if (!f.inicioEm) return <span className="text-sm text-text-muted">—</span>;
        const decorridoMin = Math.floor((now - parseISO(f.inicioEm).getTime()) / 60_000);
        const atrasada = f.fimPrevisto ? now > parseISO(f.fimPrevisto).getTime() : false;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
              atrasada
                ? "bg-accent-red-50 text-accent-red-600 border border-accent-red-200"
                : "bg-gray-50 text-text-secondary"
            }`}
          >
            {atrasada && <AlertTriangle size={12} className="text-accent-red-500" />}
            {formatDecorrido(decorridoMin)}
            {atrasada && <span className="font-normal">excesso</span>}
          </span>
        );
      },
    },
    {
      key: "observacoesBrindes",
      label: "Brindes",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block whitespace-normal max-w-[280px]">
          {f.observacoesBrindes || "—"}
        </span>
      ),
    },
    {
      key: "observacoesBrindesPais",
      label: "Brindes dos Pais",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block whitespace-normal max-w-[280px]">
          {f.observacoesBrindesPais || "—"}
        </span>
      ),
    },
    {
      key: "observacoesLesoes",
      label: "Obs. Lesões",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block whitespace-normal max-w-[280px]">
          {f.observacoesLesoes || "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Festas a Acabar"
        subtitle="Festas em curso ordenadas por hora de saída"
        actions={
          <button
            onClick={toggleTVMode}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-brand-500/5 transition-colors"
            title={isTVMode ? "Sair do modo ecrã" : "Modo ecrã"}
          >
            {isTVMode ? <Minimize2 size={16} /> : <Tv size={16} />}
            <span className="hidden sm:inline">{isTVMode ? "Sair" : "Ecrã"}</span>
          </button>
        }
      />

      <DataTable<FestaAcabar>
        data={festas}
        columns={columns}
        itemLabel="festas em curso"
        loading={isLoading}
        defaultSort={{ key: "fimPrevisto", direction: "asc" }}
        searchable
        searchPlaceholder="Pesquisar por aniversariante, sala..."
        searchFn={(f, q) =>
          (f.nomeFesta ?? "").toLowerCase().includes(q) ||
          (f.localNome ?? "").toLowerCase().includes(q)
        }
        pagination
        pageSize={10}
        renderActions={(f) => (
          <div className="flex items-center justify-end gap-1">
            <Tooltip content="Histórico (participantes)" position="top" theme="dark">
              <button
                onClick={() => setHistoricoId(f.id)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
              >
                <History size={15} />
              </button>
            </Tooltip>
            <Tooltip content="Editar observações" position="top" theme="dark">
              <button
                onClick={() => handleEdit(f)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
              >
                <Pencil size={15} />
              </button>
            </Tooltip>
            <Tooltip content="Finalizar festa" position="top" theme="dark">
              <button
                onClick={() => setConfirmandoFinalizar(f)}
                className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
              >
                <CheckCircle2 size={15} />
              </button>
            </Tooltip>
          </div>
        )}
        emptyState={{
          title: "Sem festas em curso",
          description: "Não há festas a decorrer neste momento.",
        }}
      />

      {/* Modal de edição */}
      {editing && (
        <Modal isOpen={!!editing} onClose={() => setEditing(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Observações</h2>
            <p className="text-sm text-text-muted mb-4">{editing.festa.nomeFesta}</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Brindes
                </label>
                <TextArea
                  placeholder="Brindes da festa..."
                  value={editing.brindes}
                  onChange={(v) => setEditing({ ...editing, brindes: v })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Brindes dos Pais
                </label>
                <TextArea
                  placeholder="Brindes oferecidos pelos pais..."
                  value={editing.brindesPais}
                  onChange={(v) => setEditing({ ...editing, brindesPais: v })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Observações de Lesões
                </label>
                <TextArea
                  placeholder="Lesões, condições especiais..."
                  value={editing.lesoes}
                  onChange={(v) => setEditing({ ...editing, lesoes: v })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={atualizar.isPending}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {atualizar.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmação de finalização de festa */}
      <ConfirmActionModal
        isOpen={!!confirmandoFinalizar}
        onClose={() => setConfirmandoFinalizar(null)}
        onConfirm={handleConfirmarFinalizar}
        title="Finalizar festa"
        message={`Pretende concluir a festa de "${confirmandoFinalizar?.nomeFesta ?? ""}"? Os cacifos associados serão libertados automaticamente. Esta ação é irreversível.`}
        confirmText="Finalizar"
        variant="success"
        isConfirming={finalizar.isPending}
      />

      {/* Histórico: participantes (check-in/out) + timeline de etapas */}
      <FestaHistoricoModal reservaId={historicoId} onClose={() => setHistoricoId(null)} />
    </div>
  );
}

// ── Histórico Modal (participantes + etapas) ───────────────────────
function FestaHistoricoModal({ reservaId, onClose }: { reservaId: string | null; onClose: () => void }) {
  const { data: reserva, isLoading } = useReserva(reservaId ?? "");

  if (!reservaId) return null;

  const participantes = reserva?.participantes ?? [];
  const presentes = participantes.filter((p) => p.presente).length;
  const etapas = reserva?.etapas ?? [];
  const etapasConcluidas = etapas.filter((e) => e.concluida).length;

  return (
    <Modal isOpen={!!reservaId} onClose={onClose} size="xl" title="Participantes">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {isLoading || !reserva ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-text-muted">A carregar histórico...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Resumo de presenças */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand-500" />
                <span className="text-sm font-medium text-text-primary">
                  {presentes}/{participantes.length || (reserva.numCriancas ?? 0)} presentes
                </span>
              </div>
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${presentes === participantes.length && participantes.length > 0 ? "bg-accent-green-500" : "bg-primary-400"}`}
                  style={{ width: `${participantes.length > 0 ? (presentes / participantes.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Participantes */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Participantes ({participantes.length})
              </h3>
              {participantes.length === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">Sem participantes registados.</p>
              ) : (
                <div className="space-y-1">
                  {participantes.map((p, i) => (
                    <div key={p.id ?? i} className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-border transition-all">
                      <span className={`shrink-0 ${p.presente ? "text-accent-green-500" : "text-text-muted"}`}>
                        {p.presente ? <CheckCircle size={16} /> : <XCircle size={16} />}
                      </span>
                      <span className="text-sm text-text-primary flex-1">{p.nome}</span>
                      {p.cacifo && (
                        <span className="text-xs px-2 py-0.5 bg-primary-50 text-primary-500 rounded-full">
                          Cacifo #{p.cacifo.numero}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.presente ? "bg-accent-green-50 text-accent-green-600" : "bg-gray-100 text-text-muted"}`}>
                        {p.presente ? "Presente" : "Ausente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Etapas timeline — oculto per pedido do cliente (12/07/2026)
            {etapas.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Etapas ({etapasConcluidas}/{etapas.length})
                </h3>
                <div className="space-y-1">
                  {etapas.map((etapa, i) => (
                    <div key={etapa.id ?? i} className="flex items-center gap-2 py-2 px-3 rounded-lg border border-transparent">
                      <span className={`shrink-0 ${etapa.concluida ? "text-accent-green-500" : "text-text-muted"}`}>
                        {etapa.concluida ? <CheckCircle size={16} /> : <Clock size={16} />}
                      </span>
                      <span className={`text-sm flex-1 ${etapa.concluida ? "text-text-primary" : "text-text-muted"}`}>
                        {etapa.etapa?.nome ?? "—"}
                      </span>
                      {etapa.concluidaEm && (
                        <span className="text-xs text-text-muted">
                          {new Date(etapa.concluidaEm).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${etapa.concluida ? "bg-accent-green-50 text-accent-green-600" : "bg-gray-100 text-text-muted"}`}>
                        {etapa.concluida ? "Concluída" : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )} */}
          </div>
        )}
      </div>
    </Modal>
  );
}

