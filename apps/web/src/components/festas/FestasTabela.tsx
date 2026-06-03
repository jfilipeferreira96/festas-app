"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Plus, Eye, Pencil, Trash2, CheckCircle2, Play, XCircle, Users, UserCheck } from "lucide-react";
import { PageHeader, StatusBadge, Button, type StatusType } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { useReservas, useDeleteReserva, useUpdateReservaStatus, useIniciarReserva } from "@/hooks/use-reservas";
import FestaForm from "./FestaForm";
import FestaDetailModal from "./FestaDetailModal";
import CheckInModal from "./CheckInModal";
import type { Reserva, EstadoReserva } from "@/lib/api/reservas";
import DataTable from "@/components/ui/table/DataTable";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import { formatDate, formatDuration } from "@/utils/date";
import { differenceInYears } from "date-fns";

const ESTADO_LABELS: Record<string, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const FILTER_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "RESERVA", label: "Pendentes" },
  { value: "CONFIRMADO", label: "Confirmadas" },
  { value: "EM_CURSO", label: "Em curso" },
  { value: "CONCLUIDA", label: "Concluídas" },
];

export default function FestasTabela() {
  const [filtro, setFiltro] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [viewingReservaId, setViewingReservaId] = useState<string | null>(null);
  const [checkInReserva, setCheckInReserva] = useState<Reserva | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [iniciarFestaReserva, setIniciarFestaReserva] = useState<Reserva | null>(null);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  // Build filter params
  const filtros = React.useMemo(() => {
    const hoje = new Date().toISOString().split("T")[0];
    if (filtro === "hoje") return { data: hoje };
    if (filtro === "semana") {
      return {}; // TODO: add date range filter
    }
    if (["RESERVA", "CONFIRMADO", "EM_CURSO", "CONCLUIDA"].includes(filtro)) {
      return { estado: filtro as EstadoReserva };
    }
    return undefined;
  }, [filtro]);

  const { data: reservas, isLoading } = useReservas(filtros);
  const deleteReserva = useDeleteReserva();
  const updateStatus = useUpdateReservaStatus();
  const iniciarFesta = useIniciarReserva();

  const handleCreate = useCallback(() => {
    setEditingReserva(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((reserva: Reserva) => {
    setEditingReserva(reserva);
    setShowForm(true);
  }, []);

  const handleView = useCallback((reserva: Reserva) => {
    setViewingReservaId(reserva.id);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeleteModal({ isOpen: true, id });
  }, []);

  const confirmDelete = useCallback(async () => {
    await deleteReserva.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "" });
  }, [deleteReserva, deleteModal.id]);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingReserva(null);
  }, []);

  // ── Quick Actions ──────────────────────────────────────────────
  const handleConfirmar = useCallback(async (id: string) => {
    await updateStatus.mutateAsync({ id, estado: "CONFIRMADO" });
  }, [updateStatus]);

  const handleCancelar = useCallback((id: string) => {
    setCancelModal({ isOpen: true, id });
  }, []);

  const confirmCancel = useCallback(async () => {
    await updateStatus.mutateAsync({ id: cancelModal.id, estado: "CANCELADA" });
    setCancelModal({ isOpen: false, id: "" });
  }, [updateStatus, cancelModal.id]);

  const handleIniciarFesta = useCallback(async () => {
    if (!iniciarFestaReserva) return;
    await iniciarFesta.mutateAsync(iniciarFestaReserva.id);
    setIniciarFestaReserva(null);
  }, [iniciarFesta, iniciarFestaReserva]);

  return (
    <div>
      <PageHeader
        title="Festas"
        subtitle={`Gestão de festas — ${todayStr}`}
      />

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mt-4 mb-6 flex-wrap">
        {/* Left: Filter pills group */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto filter-scrollbar max-w-full">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFiltro(opt.value)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                  filtro === opt.value
                    ? "bg-brand-500 text-white shadow-theme-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Action button */}
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus size={16} />
          Nova Festa
        </Button>
      </div>

      {/* Table */}
      <DataTable<Reserva>
        data={reservas?.items || []}
        itemLabel="festas"
        defaultSort={{ key: "data", direction: "desc" }}
        columns={[
          {
            key: "aniversariante",
            label: "Aniversariante",
            sortable: true,
            render: (_v, r) => {
              const anvNomes = r.aniversariantes?.map(a => a.aniversariante.nome).filter(Boolean).join(", ") || "—";
              const idades = r.aniversariantes
                ?.filter(a => a.aniversariante?.dataNascimento)
                .map(a => `${differenceInYears(new Date(r.data ?? new Date()), new Date(a.aniversariante.dataNascimento!))} anos`)
                .join(", ");
              return (
                <div className="flex items-center gap-2">
                  <FestaColorDot color={r.cor} />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{anvNomes}</p>
                    {idades && (
                      <p className="text-xs text-primary-500 font-medium">{idades}</p>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: "contacto",
            label: "Encarregado",
            render: (_v, r) => (
              <div>
                <p className="text-sm font-medium text-text-primary">{r.cliente?.nome ?? "—"}</p>
                <p className="text-xs text-text-muted">
                  {r.cliente?.telefone ?? ""}
                  {r.cliente?.telefone && r.cliente?.email ? " · " : ""}
                  {r.cliente?.email ?? ""}
                </p>
              </div>
            ),
          },
          {
            key: "data",
            label: "Data / Hora",
            sortable: true,
            render: (_v, r) => (
              <div>
                <p className="text-sm text-text-primary">{formatDate(r.data)}</p>
                <p className="text-xs text-text-muted">{r.horario} · {formatDuration(r.duracaoMinutos)}</p>
              </div>
            ),
          },
          {
            key: "local",
            label: "Sala",
            render: (_v, r) => (
              <span className="text-sm text-text-secondary">{r.local?.nome ?? "—"}</span>
            ),
          },
          {
            key: "numCriancas",
            label: "Participantes",
            sortable: true,
            render: (_v, r) => {
              const previstos = r.numCriancas ?? 0;
              const participantes = r.participantes;
              const total = participantes?.length ?? 0;
              const presentes = participantes?.filter((p) => p.presente).length ?? 0;
              const pct = total > 0 ? Math.round((presentes / total) * 100) : 0;
              return (
                <div className="min-w-[100px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-text-primary">
                      {presentes}<span className="text-text-muted font-normal">/{total || previstos}</span>
                    </span>
                    <Users size={13} className="text-text-muted" />
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${pct === 100 ? "bg-accent-green-500" : pct > 0 ? "bg-primary-400" : ""}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {total > 0 ? (
                    <p className="text-[11px] text-text-muted mt-1">
                      {pct === 100 ? "Todos presentes" : `${pct}% check-in`}
                    </p>
                  ) : (
                    <p className="text-[11px] text-text-muted mt-1">{previstos} previstos</p>
                  )}
                </div>
              );
            },
          },
          {
            key: "temaMenu",
            label: "Tema / Menu",
            render: (_v, r) => {
              const hasTema = !!r.tema;
              const hasMenu = !!r.menu;
              if (!hasTema && !hasMenu) return <span className="text-sm text-text-muted">—</span>;
              return (
                <div>
                  {hasTema && <p className="text-sm text-text-primary">{r.tema}</p>}
                  {hasMenu && (
                    <p className="text-xs text-text-muted">
                      🍽 {r.menu!.nome}
                      {r.menu!.preco != null && (
                        <span className="ml-1">({new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(r.menu!.preco)})</span>
                      )}
                    </p>
                  )}
                </div>
              );
            },
          },
          {
            key: "estado",
            label: "Estado",
            sortable: true,
            render: (_v, r) => (
              <StatusBadge status={r.estado as StatusType}>
                {ESTADO_LABELS[r.estado] ?? r.estado}
              </StatusBadge>
            ),
          },
        ]}
        loading={isLoading}
        searchable
        searchPlaceholder="Pesquisar por nome, contacto, email..."
        searchFn={(r, q) => {
          const anvNomes = r.aniversariantes?.map(a => a.aniversariante.nome).join(" ") ?? "";
          const cliente = r.cliente?.nome ?? "";
          const telefone = r.cliente?.telefone ?? "";
          const email = r.cliente?.email ?? "";
          return (
            anvNomes.toLowerCase().includes(q) ||
            cliente.toLowerCase().includes(q) ||
            telefone.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q)
          );
        }}
        pagination
        pageSize={10}
        onView={handleView}
        onEdit={handleEdit}
        renderActions={(r) => (
          <div className="flex items-center justify-end gap-1">
            {/* Quick action: Confirmar */}
            {r.estado === "RESERVA" && (
              <button
                onClick={() => handleConfirmar(r.id)}
                className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
                title="Confirmar festa"
              >
                <CheckCircle2 size={15} />
              </button>
            )}
            {/* Quick action: Iniciar Festa */}
            {r.estado === "CONFIRMADO" && (
              <button
                onClick={() => setIniciarFestaReserva(r)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-text-muted hover:text-brand-500 transition-colors"
                title="Iniciar festa"
              >
                <Play size={15} />
              </button>
            )}
            {/* Quick action: Check-in */}
            {(r.estado === "CONFIRMADO" || r.estado === "EM_CURSO") && (
              <button
                onClick={() => setCheckInReserva(r)}
                className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
                title="Check-in participantes"
              >
                <UserCheck size={15} />
              </button>
            )}
            {/* Quick action: Cancelar */}
            {(r.estado === "RESERVA" || r.estado === "CONFIRMADO") && (
              <button
                onClick={() => handleCancelar(r.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                title="Cancelar festa"
              >
                <XCircle size={15} />
              </button>
            )}
            <button onClick={() => handleView(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors" title="Ver detalhes">
              <Eye size={15} />
            </button>
            {r.estado !== "CONCLUIDA" && r.estado !== "CANCELADA" && (
              <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors" title="Editar">
                <Pencil size={15} />
              </button>
            )}
            {r.estado !== "EM_CURSO" && (
              <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors" title="Eliminar">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
        emptyState={{
          title: "Nenhuma festa encontrada",
          description: "Comece por criar uma nova festa.",
          action: (
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus size={16} />
              Nova Festa
            </Button>
          ),
        }}
      />

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={handleFormClose} size="2xl">
          <div className="p-8">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingReserva ? "Editar Festa" : "Nova Festa"}
            </h2>
            <FestaForm reserva={editingReserva} onClose={handleFormClose} />
          </div>
        </Modal>
      )}

      {/* Detail Modal — shared self-contained modal */}
      <FestaDetailModal
        reservaId={viewingReservaId}
        onClose={() => setViewingReservaId(null)}
      />

      {/* Check-in Modal */}
      {checkInReserva && (
        <CheckInModal reserva={checkInReserva} onClose={() => setCheckInReserva(null)} />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "" })}
        onConfirm={confirmDelete}
        title="Eliminar Festa"
        message="Tem a certeza que deseja eliminar esta festa? Esta acção não pode ser revertida."
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteReserva.isPending}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmActionModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal({ isOpen: false, id: "" })}
        onConfirm={confirmCancel}
        title="Cancelar Festa"
        message="Tem a certeza que deseja cancelar esta festa?"
        confirmText="Cancelar Festa"
        variant="warning"
        isConfirming={updateStatus.isPending}
      />

      {/* Iniciar Festa Confirmation Modal */}
      {iniciarFestaReserva && (
        <Modal isOpen={!!iniciarFestaReserva} onClose={() => setIniciarFestaReserva(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-2 flex items-center gap-2">
              <Play size={20} className="text-brand-500" />
              Iniciar Festa
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              Confirme os dados antes de iniciar a festa. Esta acção irá transformar a reserva numa festa em curso.
            </p>

            {/* Summary */}
            <div className="bg-surface rounded-lg border border-border p-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Aniversariante</span>
                <span className="text-text-primary font-medium">{iniciarFestaReserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Encarregado</span>
                <span className="text-text-primary">{iniciarFestaReserva.cliente?.nome ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Sala</span>
                <span className="text-text-primary">{iniciarFestaReserva.local?.nome ?? "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Nº Crianças</span>
                <span className="text-text-primary">{iniciarFestaReserva.numCriancas}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Duração</span>
                <span className="text-text-primary">{formatDuration(iniciarFestaReserva.duracaoMinutos)}</span>
              </div>
              {iniciarFestaReserva.menu && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Menu</span>
                  <span className="text-accent-green-400 font-medium">✓ {iniciarFestaReserva.menu.nome}</span>
                </div>
              )}
              {iniciarFestaReserva.extras.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Extras</span>
                  <span className="text-primary-500 font-medium">✓ {iniciarFestaReserva.extras.length} extras</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button variant="outline" onClick={() => setIniciarFestaReserva(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleIniciarFesta}
                disabled={iniciarFesta.isPending}
                className="flex items-center gap-2"
              >
                {iniciarFesta.isPending ? "A iniciar..." : (
                  <>
                    <Play size={16} />
                    Iniciar Festa
                  </>
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
