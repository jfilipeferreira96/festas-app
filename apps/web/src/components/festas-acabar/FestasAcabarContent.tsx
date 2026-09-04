"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Save, Clock, Pencil, CheckCircle2, AlertTriangle, History, Package, Tv, Minimize2, Gift, CreditCard, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import TextArea from "@/components/form/input/TextArea";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { useFestasAcabar, useEntradasAcabar, useAtualizarFestaAcabar, useFinalizarFesta } from "@/hooks/use-festas-acabar";
import { useTVMode } from "@/hooks/use-tv-mode";
import { useReserva, useToggleReservaExtra } from "@/hooks/use-reservas";
import EntradasAcabarSection from "./EntradasAcabarSection";
import type { FestaAcabar, EntradaAcabar } from "@/lib/api/festasAcabar";

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
  const { data: entradasRaw } = useEntradasAcabar();
  const atualizar = useAtualizarFestaAcabar();
  const finalizar = useFinalizarFesta();
  const toggleReservaExtra = useToggleReservaExtra();
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
  const entradas = (entradasRaw as unknown as EntradaAcabar[]) ?? [];

  // ── Alertas do balcão: festas/entradas por pagar ou com tempo excedido ──
  const alertas = useMemo(() => {
    let festasPorPagar = 0;
    let festasExcedidas = 0;
    for (const f of festas) {
      if (!f.pago) festasPorPagar++;
      if (f.fimPrevisto && now > parseISO(f.fimPrevisto).getTime()) festasExcedidas++;
    }
    let entradasPorPagar = 0;
    let entradasExcedidas = 0;
    for (const e of entradas) {
      if (!e.pago) entradasPorPagar++;
      if (now > parseISO(e.fimPrevisto).getTime()) entradasExcedidas++;
    }
    return {
      festasPorPagar,
      festasExcedidas,
      entradasPorPagar,
      entradasExcedidas,
      total: festasPorPagar + festasExcedidas + entradasPorPagar + entradasExcedidas,
    };
  }, [festas, entradas, now]);

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
          {f.fimPrevisto ? format(parseISO(f.fimPrevisto), "HH:mm") : "-"}
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
        <span className="text-sm text-text-secondary">{f.localNome || "-"}</span>
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
        if (!f.inicioEm) return <span className="text-sm text-text-muted">-</span>;
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
      key: "pagamento",
      label: "Pagamento",
      render: (_v, f) =>
        f.pago ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-accent-green-50 text-accent-green-600 border border-accent-green-200">
            <CheckCircle2 size={12} /> Pago
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-accent-red-50 text-accent-red-600 border border-accent-red-200">
            <CreditCard size={12} /> Por pagar
          </span>
        ),
    },
    {
      key: "extras",
      label: "Extras",
      render: (_v, f) => {
        if (!f.extras || f.extras.length === 0) {
          return <span className="text-xs text-text-muted/50">-</span>;
        }
        return (
          <div className="flex flex-col gap-1 min-w-[120px]">
            {f.extras.map((re) => (
              <button
                key={re.id}
                type="button"
                onClick={() => toggleReservaExtra.mutate(re.id)}
                disabled={toggleReservaExtra.isPending}
                className="flex items-center gap-1.5 text-left group/extra disabled:opacity-50"
                title={re.concluido ? "Entregue - clicar para reabrir" : "Marcar como entregue"}
              >
                <CheckCircle2
                  size={14}
                  className={`shrink-0 ${re.concluido ? "text-accent-green-500" : "text-gray-300 group-hover/extra:text-accent-green-400 transition-colors"}`}
                />
                <span className={`text-xs ${re.concluido ? "text-text-muted line-through" : "text-text-secondary"}`}>
                  {re.quantidade > 1 ? `${re.quantidade}× ` : ""}{re.nome}
                </span>
              </button>
            ))}
          </div>
        );
      },
    },
    {
      key: "observacoesBrindes",
      label: "Brindes",
      render: (_v, f) =>
        f.observacoesBrindes ? (
          <div className="inline-flex items-start gap-1.5 max-w-[280px] rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1.5">
            <Gift size={13} className="text-brand-600 shrink-0 mt-0.5" />
            <span className="text-xs text-brand-800 whitespace-normal">{f.observacoesBrindes}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted/50">-</span>
        ),
    },
    {
      key: "observacoesBrindesPais",
      label: "Brindes Pais",
      render: (_v, f) =>
        f.observacoesBrindesPais ? (
          <div className="inline-flex items-start gap-1.5 max-w-[280px] rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1.5">
            <Gift size={13} className="text-brand-600 shrink-0 mt-0.5" />
            <span className="text-xs text-brand-800 whitespace-normal">{f.observacoesBrindesPais}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted/50">-</span>
        ),
    },
    {
      key: "observacoesLesoes",
      label: "⚠ Lesões",
      render: (_v, f) =>
        f.observacoesLesoes ? (
          <div className="inline-flex items-start gap-1.5 max-w-[280px] rounded-lg bg-accent-orange-50 border border-accent-orange-200 px-2.5 py-1.5">
            <AlertTriangle size={13} className="text-accent-orange-600 shrink-0 mt-0.5" />
            <span className="text-xs text-accent-orange-800 whitespace-normal">{f.observacoesLesoes}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted/50">-</span>
        ),
    },
    {
      key: "notasCacifos",
      label: "Obs. Cacifos",
      render: (_v, f) => {
        const notas = f.notasCacifos || f.observacoesCacifo;
        if (!notas) return <span className="text-xs text-text-muted/50">-</span>;
        return (
          <div className="inline-flex items-start gap-1.5 max-w-[280px] rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1.5">
            <Package size={13} className="text-brand-600 shrink-0 mt-0.5" />
            <span className="text-xs text-brand-800 whitespace-normal">{notas}</span>
          </div>
        );
      },
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

      {/* ── Alerta do balcão: por pagar / tempo excedido ── */}
      {alertas.total > 0 && (
        <div className="animate-alerta-piscar flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border-2 border-accent-red-400 bg-accent-red-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-sm font-bold text-accent-red-700">
            <AlertTriangle size={16} /> Atenção balcão
          </span>
          {alertas.festasPorPagar > 0 && (
            <span className="text-[13px] font-medium text-accent-red-700">
              {alertas.festasPorPagar} festa(s) por pagar
            </span>
          )}
          {alertas.festasExcedidas > 0 && (
            <span className="text-[13px] font-medium text-accent-red-700">
              {alertas.festasExcedidas} festa(s) com tempo excedido
            </span>
          )}
          {alertas.entradasPorPagar > 0 && (
            <span className="text-[13px] font-medium text-accent-red-700">
              {alertas.entradasPorPagar} entrada(s) livre(s) por pagar
            </span>
          )}
          {alertas.entradasExcedidas > 0 && (
            <span className="text-[13px] font-medium text-accent-red-700">
              {alertas.entradasExcedidas} entrada(s) com tempo excedido
            </span>
          )}
        </div>
      )}

      <DataTable<FestaAcabar>
        data={festas}
        columns={columns}
        itemLabel="festas em curso"
        rowClassName={(f) =>
          !f.pago || (f.fimPrevisto ? now > parseISO(f.fimPrevisto).getTime() : false)
            ? "bg-accent-red-50/60 border-l-4 border-l-accent-red-400"
            : ""
        }
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

      {/* ── Entradas livres ativas ── */}
      <EntradasAcabarSection entradas={entradas} now={now} />

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

// ── Histórico Modal (cacifos preenchidos) ──────────────────────────
function FestaHistoricoModal({ reservaId, onClose }: { reservaId: string | null; onClose: () => void }) {
  const { data: reserva, isLoading } = useReserva(reservaId ?? "");

  if (!reservaId) return null;

  const cacifos = reserva?.cacifos ?? [];
  const historico = reserva?.cacifosHistorico ?? [];
  const totalCacifos = cacifos.length;
  const preenchidos = cacifos.filter(
    (c) => c.criancas && c.criancas.trim() && c.criancas !== "Por preencher",
  ).length;
  const pctCacifos = totalCacifos > 0 ? Math.round((preenchidos / totalCacifos) * 100) : 0;

  return (
    <Modal isOpen={!!reservaId} onClose={onClose} size="xl" title="Cacifos">
      <div className="p-6 max-h-[80vh] overflow-y-auto">
        {isLoading || !reserva ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-text-muted">A carregar histórico...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Resumo de cacifos */}
            {totalCacifos > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-brand-500" />
                  <span className="text-sm font-medium text-text-primary">
                    {preenchidos}/{totalCacifos} cacifos preenchidos
                  </span>
                </div>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pctCacifos === 100 ? "bg-accent-green-500" : "bg-brand-400"}`}
                    style={{ width: `${pctCacifos}%` }}
                  />
                </div>
              </div>
            )}

            {/* Cacifos activos */}
            <div>
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                Cacifos activos ({totalCacifos})
              </h3>
              {totalCacifos === 0 ? (
                <p className="text-sm text-text-muted py-4 text-center">Sem cacifos atribuídos.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {cacifos.map((c) => {
                    const porPreencher = !c.criancas || !c.criancas.trim() || c.criancas === "Por preencher";
                    return (
                      <div key={c.id} className={`rounded-lg p-3 text-center text-xs shadow-sm border-2 ${
                        c.estado === "OCUPADO" ? "bg-accent-red-400 text-white border-accent-red-400"
                          : porPreencher ? "bg-white text-text-secondary border-dashed border-accent-orange"
                          : c.estado === "RESERVADO" ? "bg-brand-500 text-white border-brand-500"
                          : "bg-gray-200 text-gray-500 border-gray-200"
                      }`}>
                        <div className="font-bold text-sm">#{c.numero}</div>
                        <div className="text-[10px] opacity-80">{porPreencher ? "Por preencher" : c.estado}</div>
                        {c.criancas && !porPreencher && <div className="text-[10px] mt-1 opacity-90 truncate" title={c.criancas}>{c.criancas}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cacifos histórico */}
            {historico.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Histórico de cacifos ({historico.length})
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {historico.map((c, i) => (
                    <div key={`hist-${i}`} className="bg-gray-50 border border-border rounded-lg p-3 text-center text-xs">
                      <div className="font-bold text-sm text-text-primary">#{c.numero}</div>
                      {c.criancas && <div className="text-[10px] text-text-secondary truncate" title={c.criancas}>{c.criancas}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

