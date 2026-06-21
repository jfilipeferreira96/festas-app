"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UserCog, Plus, Pencil, Trash2, MapPin, Clock } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import DatePicker from "@/components/form/date-picker";
import { useAlocacoesByDate, useDeleteAlocacao } from "@/hooks/use-alocacoes-monitor";
import { useLocais } from "@/hooks/use-locais";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import MonitorTimeline from "./MonitorTimeline";
import AlocacaoMonitorForm from "./AlocacaoMonitorForm";
import NotasDiariasPanel from "./NotasDiariasPanel";
import { corPorId } from "@/lib/local-cores";
import { formatarIntervalo } from "@/lib/api/alocacaoMonitor";
import type { AlocacaoMonitor } from "@/lib/api/alocacaoMonitor";
import { formatDate, toLocalISODate } from "@/utils/date";

export default function MonitoresEscalacaoContent() {
  const [selectedDate, setSelectedDate] = useState(() => toLocalISODate(new Date()));
  const [formOpen, setFormOpen] = useState(false);
  const [editingAlocacao, setEditingAlocacao] = useState<AlocacaoMonitor | null>(null);
  const [selectedAlocacao, setSelectedAlocacao] = useState<AlocacaoMonitor | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; alocacao: AlocacaoMonitor | null }>({
    isOpen: false,
    alocacao: null,
  });

  const { data: alocacoes, isLoading } = useAlocacoesByDate(selectedDate);
  const { data: locais } = useLocais();
  const deleteAlocacao = useDeleteAlocacao();
  const { canWrite } = useMinhasPermissoes();
  const podeEditar = canWrite("reservas");

  const formattedDate = formatDate(selectedDate);

  // Estável (useCallback) — evita re-inicialização do flatpickr a cada render.
  const handleDateChange = useCallback(([date]: Date[]) => {
    if (!date) return;
    setSelectedDate(toLocalISODate(date));
  }, []);

  const handleAdd = useCallback(() => {
    setEditingAlocacao(null);
    setFormOpen(true);
  }, []);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedAlocacao) return;
    setEditingAlocacao(selectedAlocacao);
    setSelectedAlocacao(null);
    setFormOpen(true);
  }, [selectedAlocacao]);

  const handleBarClick = useCallback(
    (a: AlocacaoMonitor) => {
      if (podeEditar) {
        setSelectedAlocacao(a);
      }
    },
    [podeEditar]
  );

  const requestDelete = useCallback((a: AlocacaoMonitor) => {
    // Fecha o modal de detalhe primeiro para evitar sobreposição de modais
    // (o ConfirmActionModal abria por cima do detalhe e ficava inacessível).
    setSelectedAlocacao(null);
    setDeleteModal({ isOpen: true, alocacao: a });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteModal.alocacao) return;
    await deleteAlocacao.mutateAsync(deleteModal.alocacao.id);
    setDeleteModal({ isOpen: false, alocacao: null });
    setSelectedAlocacao(null);
  }, [deleteAlocacao, deleteModal.alocacao]);

  // Legenda: locais activos com a sua cor
  const legendLocais = useMemo(
    () => (locais ?? []).filter((l) => l.activo),
    [locais]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Monitores"
        subtitle={`Escalação por dia — ${formattedDate}`}
        actions={
          podeEditar ? (
            <Button onClick={handleAdd} className="flex items-center gap-2">
              <Plus size={16} />
              Adicionar
            </Button>
          ) : undefined
        }
      />

      {/* Filtros: data + legenda */}
      <div className="p-4 rounded-xl bg-white border border-border shadow-theme-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <DatePicker
              id="monitores-date-picker"
              defaultDate={selectedDate}
              onChange={handleDateChange}
              className="w-44"
            />

            {/* Legenda por local */}
            {legendLocais.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-text-muted">Locais:</span>
                {legendLocais.map((l) => (
                  <span
                    key={l.id}
                    className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: corPorId(l.id).soft,
                      color: corPorId(l.id).softText,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: corPorId(l.id).bg }}
                    />
                    {l.nome}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Gantt */}
      <MonitorTimeline
        alocacoes={alocacoes ?? []}
        loading={isLoading}
        onEdit={handleBarClick}
      />

      {/* Notas Diárias (manhã / tarde) — admin escreve, monitor lê */}
      <NotasDiariasPanel data={selectedDate} />

      {/* Modal de detalhe (ao clicar numa barra) */}
      {selectedAlocacao && (
        <Modal
          isOpen={!!selectedAlocacao}
          onClose={() => setSelectedAlocacao(null)}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-50">
                  <UserCog size={20} className="text-primary-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {selectedAlocacao.monitor?.nome ?? "—"}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {formatDate(selectedAlocacao.data?.split("T")[0] ?? selectedDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
                <MapPin size={14} className="text-text-muted shrink-0" />
                <span className="text-xs font-medium text-text-muted w-20 shrink-0">Local</span>
                <span className="text-sm text-text-primary font-medium flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: corPorId(selectedAlocacao.localId).bg }}
                  />
                  {selectedAlocacao.local?.nome ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
                <Clock size={14} className="text-text-muted shrink-0" />
                <span className="text-xs font-medium text-text-muted w-20 shrink-0">Horário</span>
                <span className="text-sm text-text-primary font-medium">
                  {formatarIntervalo(selectedAlocacao.horaInicio, selectedAlocacao.horaFim)}
                </span>
              </div>
              {selectedAlocacao.observacoes && (
                <div className="px-3 py-2.5 rounded-lg bg-gray-50">
                  <span className="text-xs font-medium text-text-muted">Observações</span>
                  <p className="text-sm text-text-primary mt-0.5">{selectedAlocacao.observacoes}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button
                variant="outline"
                onClick={() => requestDelete(selectedAlocacao)}
                className="flex items-center gap-2 text-accent-red-600 border-accent-red-200 hover:bg-accent-red-50"
              >
                <Trash2 size={16} />
                Eliminar
              </Button>
              <Button onClick={handleEditFromDetail} className="flex items-center gap-2">
                <Pencil size={16} />
                Editar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Form (criar/editar) */}
      <AlocacaoMonitorForm
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingAlocacao(null);
        }}
        data={selectedDate}
        alocacao={editingAlocacao}
      />

      {/* Confirmar eliminação */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, alocacao: null })}
        onConfirm={confirmDelete}
        title="Eliminar Alocação"
        message={`Tem a certeza que deseja eliminar a alocação de "${deleteModal.alocacao?.monitor?.nome ?? ""}"? Esta acção não pode ser revertida.`}
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteAlocacao.isPending}
      />
    </div>
  );
}
