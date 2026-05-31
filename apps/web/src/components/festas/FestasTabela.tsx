"use client";

import React, { useState, useCallback } from "react";
import { Plus, Eye, Pencil, Trash2, CheckCircle2, Play, XCircle, Users, MapPin, Clock, Cake, Sparkles, Package, UserCheck } from "lucide-react";
import { PageHeader, StatusBadge, Button, type StatusType } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { StatusStepper } from "@/components/ui/status-stepper/StatusStepper";
import { useReservas, useDeleteReserva, useUpdateReservaStatus, useIniciarReserva } from "@/hooks/use-reservas";
import FestaForm from "./FestaForm";
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

const METODO_PAGAMENTO_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  MULTIBANCO: "Multibanco",
  MBWAY: "MB WAY",
  TRANSFERENCIA: "Transferência Bancária",
  CARTAO: "Cartão",
  OUTRO: "Outro",
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
  const [viewingReserva, setViewingReserva] = useState<Reserva | null>(null);
  const [iniciarFestaReserva, setIniciarFestaReserva] = useState<Reserva | null>(null);
  const [checkInReserva, setCheckInReserva] = useState<Reserva | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });

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
    setViewingReserva(reserva);
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
        subtitle="Gestão de festas"
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
              return (
                <div>
                  <p className="text-sm font-medium text-text-primary">{previstos}</p>
                  {total > 0 ? (
                    <p className="text-xs text-text-muted">
                      <span className="text-accent-green-500 font-medium">{presentes}</span>/{total} check-in
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted">previstos</p>
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
            <button onClick={() => handleView(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors" title="Ver">
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

      {/* Form Modal — wider (size="xl") */}
      {showForm && (
        <Modal isOpen={showForm} onClose={handleFormClose} size="xl">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              {editingReserva ? "Editar Festa" : "Nova Festa"}
            </h2>
            <FestaForm reserva={editingReserva} onClose={handleFormClose} />
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {viewingReserva && (
        <Modal isOpen={!!viewingReserva} onClose={() => setViewingReserva(null)} size="lg">
          <div className="p-6 max-h-[85vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {viewingReserva.cor && (
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: viewingReserva.cor }} />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    {viewingReserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || "—"}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {viewingReserva.aniversariantes
                      ?.filter(a => a.aniversariante?.dataNascimento)
                      .map(a => `${differenceInYears(new Date(viewingReserva.data ?? new Date()), new Date(a.aniversariante.dataNascimento!))} anos`)
                      .join(", ") || ""}
                  </p>
                </div>
              </div>
              <StatusBadge status={viewingReserva.estado as StatusType}>
                {ESTADO_LABELS[viewingReserva.estado] ?? viewingReserva.estado}
              </StatusBadge>
            </div>

            {/* Status Stepper */}
            <div className="mb-5 px-2">
              <StatusStepper currentStatus={viewingReserva.estado as "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA" | "CANCELADA"} />
            </div>

            {/* ── Informações Gerais ── */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users size={13} /> Informações Gerais
              </h4>
              <div className="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
                <DetailRow icon={<Cake size={13} />} label="Aniversariante" value={viewingReserva.aniversariantes?.map(a => a.aniversariante.nome).join(", ") || "—"} />
                {viewingReserva.aniversariantes?.filter(a => a.aniversariante?.dataNascimento).length ? (
                  <DetailRow icon={<Cake size={13} />} label="Idade" value={viewingReserva.aniversariantes
                    .filter(a => a.aniversariante?.dataNascimento)
                    .map(a => `${differenceInYears(new Date(viewingReserva.data ?? new Date()), new Date(a.aniversariante.dataNascimento!))} anos`)
                    .join(", ")} />
                ) : null}
                <DetailRow icon={<Users size={13} />} label="Encarregado" value={viewingReserva.cliente?.nome ?? "—"} />
                <DetailRow icon={<MapPin size={13} />} label="Telefone" value={viewingReserva.cliente?.telefone ?? "—"} />
                {viewingReserva.cliente?.email && <DetailRow icon={<MapPin size={13} />} label="Email" value={viewingReserva.cliente.email} />}
              </div>
            </div>

            {/* ── Data e Local ── */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock size={13} /> Data e Local
              </h4>
              <div className="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
                <DetailRow icon={<Clock size={13} />} label="Data" value={formatDate(viewingReserva.data)} />
                <DetailRow icon={<Clock size={13} />} label="Horário" value={`${viewingReserva.horario} (${formatDuration(viewingReserva.duracaoMinutos)})`} />
                <DetailRow icon={<MapPin size={13} />} label="Sala" value={viewingReserva.local?.nome ?? "—"} />
                <DetailRow icon={<Users size={13} />} label="Nº Crianças" value={String(viewingReserva.numCriancas ?? 0)} />
              </div>
            </div>

            {/* ── Tema e Bolo ── */}
            {(viewingReserva.tema || viewingReserva.bolo) && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkles size={13} /> Tema e Bolo
                </h4>
                <div className="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
                  {viewingReserva.tema && <DetailRow icon={<Sparkles size={13} />} label="Tema" value={viewingReserva.tema} />}
                  {viewingReserva.bolo && <DetailRow icon={<Cake size={13} />} label="Bolo" value={viewingReserva.bolo} />}
                </div>
              </div>
            )}

            {/* ── Monitores ── */}
            {viewingReserva.monitores && viewingReserva.monitores.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users size={13} /> Monitores
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {viewingReserva.monitores.map((m) => (
                    <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 text-xs rounded-full font-medium">
                      {m.monitor.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Etapas ── */}
            {viewingReserva.etapas && viewingReserva.etapas.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package size={13} /> Etapas ({viewingReserva.etapas.filter(e => e.concluida).length}/{viewingReserva.etapas.length})
                </h4>
                <div className="space-y-1">
                  {viewingReserva.etapas.map((etapa) => (
                    <div key={etapa.id} className="flex items-center justify-between py-0.5">
                      <span className="text-sm text-text-primary">{etapa.etapa.nome}</span>
                      <span className={`text-xs font-medium ${etapa.concluida ? "text-accent-green-400" : "text-text-muted"}`}>
                        {etapa.concluida ? "✓ Concluída" : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Pagamento ── */}
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Pagamento</h4>
              <div className="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
                {viewingReserva.metodoPagamento && <DetailRow label="Método" value={METODO_PAGAMENTO_LABELS[viewingReserva.metodoPagamento] ?? viewingReserva.metodoPagamento} />}
                {viewingReserva.valorPago != null && <DetailRow label="Valor Pago" value={new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(viewingReserva.valorPago)} />}
                <DetailRow label="Pago" value={viewingReserva.pago ? "Sim" : "Não"} />
              </div>
            </div>

            {/* Menu / Lanche */}
            {viewingReserva.menu && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Lanche / Menu</h4>
                <div className="p-3 rounded-lg bg-surface border border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-primary">{viewingReserva.menu.nome}</span>
                    <span className="text-text-secondary">
                      {new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(viewingReserva.menu.preco)}
                    </span>
                  </div>
                  {viewingReserva.menu.notas && (
                    <p className="text-xs text-text-muted mt-1">{viewingReserva.menu.notas}</p>
                  )}
                </div>
              </div>
            )}

            {/* Extras */}
            {viewingReserva.extras.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Extras</h4>
                <div className="flex flex-wrap gap-1">
                  {viewingReserva.extras.map((e) => (
                    <span key={e.extra.id} className="px-2 py-0.5 bg-primary-50 text-primary-500 text-xs rounded-full">
                      {e.extra.nome}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notas */}
            {viewingReserva.notas && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Notas</h4>
                <p className="text-sm text-text-secondary p-3 rounded-lg bg-surface border border-border">{viewingReserva.notas}</p>
              </div>
            )}

            {/* Cacifos */}
            {(viewingReserva.cacifosHistorico && viewingReserva.cacifosHistorico.length > 0) && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cacifos utilizados</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {viewingReserva.cacifosHistorico.map((c, i) => (
                    <div key={i} className="bg-gray-50 border border-border rounded-lg p-1.5 text-center">
                      <div className="text-sm font-bold text-text-primary">#{c.numero}</div>
                      {c.criancas && <div className="text-[10px] text-text-secondary truncate" title={c.criancas}>{c.criancas}</div>}
                      {c.notas && <div className="text-[10px] text-text-muted truncate" title={c.notas}>📝 {c.notas}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(viewingReserva.cacifos && viewingReserva.cacifos.length > 0) && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Cacifos</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {viewingReserva.cacifos.map((c) => (
                    <div key={c.id} className="bg-gray-50 border border-border rounded-lg p-1.5 text-center">
                      <div className="text-sm font-bold text-text-primary">#{c.numero}</div>
                      <div className="text-[10px] text-text-muted">{c.estado}</div>
                      {c.criancas && <div className="text-[10px] text-text-secondary truncate" title={c.criancas}>{c.criancas}</div>}
                      {c.notas && <div className="text-[10px] text-text-muted truncate" title={c.notas}>📝 {c.notas}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions in Detail View */}
            <div className="border-t border-border pt-4 mt-4 flex items-center gap-3">
              <Button variant="outline" onClick={() => setViewingReserva(null)} className="flex-1 rounded-[10px] px-5 py-3">
                Fechar
              </Button>
              <div className="flex gap-2 flex-1 justify-end">
                {(viewingReserva.estado === "RESERVA" || viewingReserva.estado === "CONFIRMADO") && (
                  <button
                    onClick={async () => {
                      await handleCancelar(viewingReserva.id);
                      setViewingReserva(null);
                    }}
                    className="rounded-[10px] px-5 py-3 text-sm font-medium text-accent-red hover:bg-red-50 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                {viewingReserva.estado === "RESERVA" && (
                  <Button
                    onClick={async () => {
                      await handleConfirmar(viewingReserva.id);
                      setViewingReserva(null);
                    }}
                    className="flex items-center gap-2 rounded-[10px] px-5 py-3"
                  >
                    <CheckCircle2 size={16} />
                    Confirmar
                  </Button>
                )}
                {viewingReserva.estado === "CONFIRMADO" && (
                  <Button
                    onClick={() => {
                      setIniciarFestaReserva(viewingReserva);
                      setViewingReserva(null);
                    }}
                    className="flex items-center gap-2 rounded-[10px] px-5 py-3"
                  >
                    <Play size={16} />
                    Iniciar Festa
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
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
            <div className="border-t border-border pt-4 mt-4 flex items-center gap-3">
              <Button variant="outline" onClick={() => setIniciarFestaReserva(null)} className="flex-1 rounded-[10px] px-5 py-3">
                Cancelar
              </Button>
              <div className="flex gap-2 flex-1 justify-end">
                <Button
                  onClick={handleIniciarFesta}
                  disabled={iniciarFesta.isPending}
                  className="flex items-center gap-2 rounded-[10px] px-5 py-3"
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
          </div>
        </Modal>
      )}

      {/* Check-in Modal */}
      {checkInReserva && (
        <CheckInModal reserva={checkInReserva} onClose={() => setCheckInReserva(null)} />
      )}
    </div>
  );
}

function DetailRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon && <span className="text-text-muted shrink-0">{icon}</span>}
      <span className="text-xs text-text-muted w-24 shrink-0">{label}:</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}
