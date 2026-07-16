 "use client";

import React, { useState, useCallback, useMemo } from "react";
import { Plus, Eye, Pencil, Trash2, CheckCircle2, Play, XCircle, Users, SquareCheck, History, Clock, ClipboardList, Bell } from "lucide-react";
import { PageHeader, StatusBadge, Button, type StatusType } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import ConcluirResumoModal from "@/components/shared/ConcluirResumoModal";
import { useReservas, useDeleteReserva, useUpdateReservaStatus, useIniciarReserva, useFinalizarReserva } from "@/hooks/use-reservas";
import { useSlotsDia, useSlotsHorario } from "@/hooks/use-slots-horario";
import FestaForm, { type FestaFormInitialValues } from "./FestaForm";
import FestaDetailModal from "./FestaDetailModal";
import HistoricoModal from "./HistoricoModal";
import PreencherCacifosModal from "@/components/cacifos/PreencherCacifosModal";
import FestasToolbar, { type FestaTab } from "./FestasToolbar";
import SlotsPorPreencher from "./SlotsPorPreencher";
import DatePicker from "@/components/form/date-picker";
import type { Reserva, EstadoReserva } from "@/lib/api/reservas";
import { getAniversarianteNome } from "@/lib/api/reservas";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { formatDate, formatDuration } from "@/utils/date";
import { differenceInYears } from "date-fns";
import { BOLO_LABELS_SHORT } from "@/lib/constants/bolo";

const ESTADO_LABELS: Record<string, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

function addMinutosToTime(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function slotLabel(horaInicio: string): string {
  const h = Number(horaInicio.split(":")[0]);
  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
}

export default function FestasTabela({ mode = "full" }: { mode?: "full" | "cacifos" }) {
  const isCacifos = mode === "cacifos";
  const [tab, setTab] = useState<FestaTab>("hoje");
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [formInitialValues, setFormInitialValues] = useState<FestaFormInitialValues | undefined>(undefined);
  const [showForm, setShowForm] = useState(false);
  const [editingReserva, setEditingReserva] = useState<Reserva | null>(null);
  const [viewingReservaId, setViewingReservaId] = useState<string | null>(null);
  const [historicoReserva, setHistoricoReserva] = useState<Reserva | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [cancelModal, setCancelModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });
  const [finalizarModal, setFinalizarModal] = useState<Reserva | null>(null);
  const [iniciarFestaReserva, setIniciarFestaReserva] = useState<Reserva | null>(null);
  const [preencherCacifosReservaId, setPreencherCacifosReservaId] = useState<string | null>(null);

  // Formatar uma data YYYY-MM-DD por extenso (pt-PT)
  const formatarData = useCallback((iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-PT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }, []);

  // Helper: Date → YYYY-MM-DD (local, sem timezone shift)
  const toLocalISO = useCallback((d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
  []);

  // Helper: amanhã em YYYY-MM-DD
  const tomorrowISO = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toLocalISO(d);
  }, [toLocalISO]);

  // Determinar o dia único mostrado (para slots vazios): dataSelecionada tem prioridade,
  // seguida dos tabs "hoje"/"amanha". Null = vista de range/estado (sem slots vazios).
  const diaUnico = useMemo<string | null>(() => {
    if (dataSelecionada) return dataSelecionada;
    if (tab === "hoje") return toLocalISO(new Date());
    if (tab === "amanha") return tomorrowISO();
    return null;
  }, [dataSelecionada, tab, toLocalISO, tomorrowISO]);

  // Subtítulo dinâmico conforme a vista seleccionada (hoje, amanhã, data, semana, estado...)
  const periodoLabel = useMemo(() => {
    if (diaUnico) return formatarData(diaUnico);
    switch (tab) {
      case "semana": return "Esta semana";
      case "em_curso": return "Festas em curso";
      case "concluidos": return "Festas concluídas";
      case "RESERVA": return "Festas pendentes";
      case "CONFIRMADO": return "Festas confirmadas";
      case "todos": return "Todas as festas";
      default: return formatarData(toLocalISO(new Date()));
    }
  }, [diaUnico, tab, formatarData, toLocalISO]);

  // Build filter params
  const filtros = React.useMemo(() => {
    if (dataSelecionada) return { data: dataSelecionada, pageSize: 200 };
    switch (tab) {
      case "hoje":    return { data: toLocalISO(new Date()), pageSize: 200 };
      case "amanha":  return { data: tomorrowISO(), pageSize: 200 };
      case "semana": {
        const now = new Date();
        const dow = now.getDay();
        const diffToMonday = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { dataInicio: toLocalISO(monday), dataFim: toLocalISO(sunday), pageSize: 200 };
      }
      case "em_curso":   return { estado: "EM_CURSO" as EstadoReserva, pageSize: 200 };
      case "concluidos": return { estado: "CONCLUIDA" as EstadoReserva, pageSize: 200 };
      case "RESERVA":    return { estado: "RESERVA" as EstadoReserva, pageSize: 200 };
      case "CONFIRMADO": return { estado: "CONFIRMADO" as EstadoReserva, pageSize: 200 };
      case "todos":
      default:           return { pageSize: 200 };
    }
  }, [tab, dataSelecionada, toLocalISO, tomorrowISO]);

  const { data: reservas, isLoading } = useReservas(filtros);
  // Slots do dia (para slots vazios) — só quando há dia único
  const { data: slotsDia } = useSlotsDia(diaUnico ?? "");
  // Definições estáticas de slots (para label do slot na coluna Data/Hora)
  const { data: slotsHorario } = useSlotsHorario();
  const deleteReserva = useDeleteReserva();
  const updateStatus = useUpdateReservaStatus();
  const iniciarFesta = useIniciarReserva();
  const finalizarReserva = useFinalizarReserva();

  const handleCreate = useCallback(() => {
    setEditingReserva(null);
    // Pré-preencher a data do dia único (para que cores/slots sejam correctos)
    setFormInitialValues(diaUnico ? { data: diaUnico } : undefined);
    setShowForm(true);
  }, [diaUnico]);

  const handleSlotClick = useCallback((initialValues: FestaFormInitialValues) => {
    setEditingReserva(null);
    setFormInitialValues(initialValues);
    setShowForm(true);
  }, []);

  const handleTabChange = useCallback((newTab: FestaTab) => {
    setDataSelecionada(null);
    setTab(newTab);
  }, []);

  // Quando o utilizador escolhe uma data no DatePicker, salta para esse dia.
  // Tab fica "data" para nenhuma tab (Hoje/Amanhã) aparecer activa.
  const handleDataChange = useCallback((selectedDates: Date[]) => {
    if (selectedDates.length > 0) {
      setDataSelecionada(toLocalISO(selectedDates[0]));
      setTab("data");
    }
  }, [toLocalISO]);

  const handlePreencherSlot = useCallback(
    (initialValues: FestaFormInitialValues) => {
      setEditingReserva(null);
      setFormInitialValues(initialValues);
      setShowForm(true);
    },
    [],
  );

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
    setFormInitialValues(undefined);
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

  const handleFinalizar = useCallback((reserva: Reserva) => {
    setFinalizarModal(reserva);
  }, []);

  const confirmFinalizar = useCallback(
    async (custoExcesso?: number) => {
      if (!finalizarModal) return;
      await finalizarReserva.mutateAsync({ id: finalizarModal.id, custoExcesso });
      setFinalizarModal(null);
    },
    [finalizarReserva, finalizarModal],
  );

  const handleIniciarFesta = useCallback(async () => {
    if (!iniciarFestaReserva) return;
    await iniciarFesta.mutateAsync(iniciarFestaReserva.id);
    setIniciarFestaReserva(null);
  }, [iniciarFesta, iniciarFestaReserva]);

  // ── Festa Actions (from slot cards) ────────────────────────────
  const handleFestaAction = useCallback((action: string, festaId: string) => {
    const reserva = reservas?.items?.find((r) => r.id === festaId);
    if (!reserva) return;
    switch (action) {
      case "view": handleView(reserva); break;
      case "edit": handleEdit(reserva); break;
      case "confirm": handleConfirmar(reserva.id); break;
      case "iniciar": setIniciarFestaReserva(reserva); break;
      case "finalizar": handleFinalizar(reserva); break;
      case "historico": setHistoricoReserva(reserva); break;
      case "cancel": handleCancelar(reserva.id); break;
      case "delete": handleDelete(reserva.id); break;
    }
  }, [reservas]);

  return (
    <div>
      <PageHeader
        title="Festas"
        subtitle={`Gestão de festas — ${periodoLabel}`}
      />

      {/* Navegação por data (card próprio, separado das tabs) */}
      {!isCacifos && (
        <div className="mt-4 p-4 rounded-xl bg-white border border-border shadow-theme-xs no-print">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-text-secondary whitespace-nowrap">
              Ir para o dia:
            </span>
            <div className="w-52">
              <DatePicker
                id="festas-data-picker"
                defaultDate={diaUnico ?? undefined}
                onChange={handleDataChange}
                placeholder="dd-mm-aaaa"
              />
            </div>
            {/* Badge visual quando sincronizado com Hoje/Amanhã */}
            {tab === "hoje" && (
              <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                Hoje
              </span>
            )}
            {tab === "amanha" && (
              <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-1 rounded-full">
                Amanhã
              </span>
            )}
          </div>
        </div>
      )}

      {/* Toolbar: tabs + Nova Festa + Imprimir */}
      <FestasToolbar
        tab={tab}
        onTabChange={handleTabChange}
        onPrint={() => window.print()}
        onCreate={!isCacifos ? handleCreate : undefined}
      />

      {/* Slots vazios do dia (apenas em vista de dia único, não-CACIFOS) */}
      {!isCacifos && diaUnico && slotsDia && slotsDia.slots.length > 0 && (
        <SlotsPorPreencher
          data={diaUnico}
          slots={slotsDia.slots}
          coresUsadas={slotsDia.coresUsadas}
          onPreencher={handlePreencherSlot}
        />
      )}

      {/* Tabela unificada */}
      <DataTable<Reserva>
        data={reservas?.items || []}
        itemLabel="festas"
        defaultSort={{ key: "data", direction: "asc" }}
        sortAccessor={(r) => `${r.data ?? ""}T${r.horario ?? ""}`}
        columns={([
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
            render: (_v, r) => {
              // Procurar slot correspondente para mostrar label (manhã/tarde/noite)
              const slot = slotsHorario?.find((s) => s.horaInicio === r.horario);
              const label = slot ? slotLabel(r.horario) : "Personalizado";
              const intervalo = `${r.horario}–${addMinutosToTime(r.horario, r.duracaoMinutos)}`;
              return (
                <div className="flex items-start gap-2 min-w-[150px]">
                  <FestaColorDot color={r.cor} className="w-4 h-4 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-text-primary leading-tight">{formatDate(r.data)}</p>
                    <p className="inline-flex items-center px-2 py-0.5 text-sm font-semibold text-brand-700 bg-brand-50 rounded-md w-fit">{intervalo}</p>
                    <p className="text-[11px] text-text-muted">
                      {label} · {formatDuration(r.duracaoMinutos)}
                    </p>
                  </div>
                </div>
              );
            },
          },
          {
            key: "local",
            label: "Sala",
            render: (_v, r) => (
              <span className="text-sm text-text-secondary">{r.local?.nome ?? "—"}</span>
            ),
          },
          {
            key: "lanche",
            label: "Lanche",
            render: (_v, r) => {
              if (!r.horaLanche && !r.salaLancheNome) {
                return <span className="text-sm text-text-muted">—</span>;
              }
              return (
                <div className="min-w-[90px]">
                  {r.horaLanche && (
                    <p className="text-sm font-medium text-text-primary flex items-center gap-1">
                      <Clock size={13} className="text-text-muted" />
                      {r.horaLanche}
                    </p>
                  )}
                  {r.salaLancheNome && (
                    <p className="text-xs text-text-muted">{r.salaLancheNome}</p>
                  )}
                </div>
              );
            },
          },
          {
            key: "numCriancas",
            label: "Cacifos",
            sortable: true,
            render: (_v, r) => {
              // CACIFOS mode: progresso de preenchimento de cacifos
              if (isCacifos) {
                const cacifos = r.cacifos ?? [];
                const total = cacifos.length;
                if (total === 0) {
                  return <span className="text-sm text-text-muted">0 cacifos</span>;
                }
                const preenchidos = cacifos.filter(
                  (c) => c.criancas && c.criancas.trim() && c.criancas !== "Por preencher",
                ).length;
                const pct = Math.round((preenchidos / total) * 100);
                return (
                  <div className="min-w-[100px]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-text-primary">
                        {preenchidos}<span className="text-text-muted font-normal">/{total}</span>
                      </span>
                      <ClipboardList size={13} className="text-text-muted" />
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${pct === 100 ? "bg-accent-green-500" : pct > 0 ? "bg-accent-orange-500" : "bg-brand-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-[11px] text-text-muted">
                        {pct === 100 ? "Todos preenchidos" : `${pct}% cacifos`}
                      </p>
                      {(r.cacifosConcluido || r.cacifosChamado) && (
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.cacifosConcluido ? "bg-accent-green-100 text-accent-green-600" : "bg-accent-orange-100 text-accent-orange-600"}`}>
                          {r.cacifosConcluido ? <SquareCheck size={10} /> : <Bell size={10} />}
                          {r.cacifosConcluido ? "Concluído" : "Chamado"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
              // Modo completo: crianças previstas vs cacifos atribuídos
              const previstos = r.numCriancas ?? r.previsaoCriancas ?? 0;
              const cacifos = r.cacifos ?? [];
              const totalCacifos = cacifos.length;
              const cacifosAtribuidos = cacifos.filter(
                (c) => c.criancas && c.criancas.trim() && c.criancas !== "Por preencher",
              ).length;
              return (
                <div className="min-w-[110px]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-text-primary">
                      {cacifosAtribuidos}<span className="text-text-muted font-normal">/{previstos}</span>
                    </span>
                    <Users size={13} className="text-text-muted" />
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${cacifosAtribuidos >= previstos && previstos > 0 ? "bg-accent-green-500" : cacifosAtribuidos > 0 ? "bg-accent-orange-500" : "bg-brand-400"}`}
                      style={{ width: `${previstos > 0 ? Math.min(100, Math.round((cacifosAtribuidos / previstos) * 100)) : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-[11px] text-text-muted">
                      {previstos} previstas{totalCacifos > 0 ? ` · ${cacifosAtribuidos} cacifos` : ""}
                    </p>
                    {(r.cacifosConcluido || r.cacifosChamado) && (
                      <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${r.cacifosConcluido ? "bg-accent-green-100 text-accent-green-600" : "bg-accent-orange-100 text-accent-orange-600"}`}>
                        {r.cacifosConcluido ? <SquareCheck size={10} /> : <Bell size={10} />}
                        {r.cacifosConcluido ? "Concluído" : "Chamado"}
                      </span>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: "temaMenu",
            label: "Bolo / Menu",
            render: (_v, r) => {
              const hasBolo = !!r.bolo;
              const hasMenu = !!r.menu;
              if (!hasBolo && !hasMenu) return <span className="text-sm text-text-muted">—</span>;
              return (
                <div>
                  {hasBolo && (
                    <p className="text-sm text-text-primary flex items-center gap-1">
                      🎂 {BOLO_LABELS_SHORT[r.bolo!] ?? r.bolo}
                      {r.boloTema && <span className="text-xs text-text-muted">· {r.boloTema}</span>}
                    </p>
                  )}
                  {hasMenu && (
                    <p className="text-xs text-text-muted">
                      🍽 {r.menu!.nome}
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
        ] as Column<Reserva>[]).filter((c) => !(isCacifos && (c.key === "contacto" || c.key === "temaMenu")))}
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
        renderActions={(r) => {
          // CACIFOS mode: "Preencher cacifos" (festas activas) + "Ver detalhes"
          if (isCacifos) {
            return (
              <div className="flex items-center justify-end gap-1">
                {(r.estado === "CONFIRMADO" || r.estado === "EM_CURSO") && (
                  <Tooltip content="Preencher cacifos" position="top" theme="dark">
                    <button
                      onClick={() => setPreencherCacifosReservaId(r.id)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-text-muted hover:text-brand-500 transition-colors"
                    >
                      <ClipboardList size={15} />
                    </button>
                  </Tooltip>
                )}
                <Tooltip content="Ver detalhes" position="top" theme="dark">
                  <button onClick={() => handleView(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors">
                    <Eye size={15} />
                  </button>
                </Tooltip>
              </div>
            );
          }
          return (
          <div className="flex items-center justify-end gap-1">
            {/* Quick action: Confirmar (RESERVA) */}
            {r.estado === "RESERVA" && (
              <Tooltip content="Confirmar festa" position="top" theme="dark">
                <button
                  onClick={() => handleConfirmar(r.id)}
                  className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
                >
                  <CheckCircle2 size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Iniciar Festa (CONFIRMADO) */}
            {r.estado === "CONFIRMADO" && (
              <Tooltip content="Iniciar festa" position="top" theme="dark">
                <button
                  onClick={() => setIniciarFestaReserva(r)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-text-muted hover:text-brand-500 transition-colors"
                >
                  <Play size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Finalizar (EM_CURSO) */}
            {r.estado === "EM_CURSO" && (
              <Tooltip content="Finalizar festa" position="top" theme="dark">
                <button
                  onClick={() => handleFinalizar(r)}
                  className="p-1.5 rounded-lg hover:bg-green-50 text-text-muted hover:text-accent-green-400 transition-colors"
                >
                  <SquareCheck size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Preencher cacifos (CONFIRMADO / EM_CURSO) */}
            {(r.estado === "CONFIRMADO" || r.estado === "EM_CURSO") && (
              <Tooltip content="Preencher cacifos" position="top" theme="dark">
                <button
                  onClick={() => setPreencherCacifosReservaId(r.id)}
                  className="p-1.5 rounded-lg hover:bg-blue-50 text-text-muted hover:text-brand-500 transition-colors"
                >
                  <ClipboardList size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Histórico (CONCLUIDA) */}
            {r.estado === "CONCLUIDA" && (
              <Tooltip content="Ver histórico" position="top" theme="dark">
                <button
                  onClick={() => setHistoricoReserva(r)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                >
                  <History size={15} />
                </button>
              </Tooltip>
            )}
            {/* Quick action: Cancelar (RESERVA / CONFIRMADO) */}
            {(r.estado === "RESERVA" || r.estado === "CONFIRMADO") && (
              <Tooltip content="Cancelar festa" position="top" theme="dark">
                <button
                  onClick={() => handleCancelar(r.id)}
                  className="p-1.5 rounded-lg hover:bg-orange-50 text-text-muted hover:text-accent-orange transition-colors"
                >
                  <XCircle size={15} />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Ver detalhes" position="top" theme="dark">
              <button onClick={() => handleView(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors">
                <Eye size={15} />
              </button>
            </Tooltip>
            {r.estado !== "CONCLUIDA" && r.estado !== "CANCELADA" && (
              <Tooltip content="Editar" position="top" theme="dark">
                <button onClick={() => handleEdit(r)} className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors">
                  <Pencil size={15} />
                </button>
              </Tooltip>
            )}
            <Tooltip content="Eliminar" position="top" theme="dark">
              <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors">
                <Trash2 size={15} />
              </button>
            </Tooltip>
          </div>
          );
        }}
        emptyState={{
          title: "Nenhuma festa encontrada",
          description: isCacifos ? "Não há festas para mostrar." : "Comece por criar uma nova festa.",
          action: isCacifos ? undefined : (
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
            <FestaForm reserva={editingReserva} onClose={handleFormClose} initialValues={formInitialValues} />
          </div>
        </Modal>
      )}

      {/* Detail Modal — shared self-contained modal */}
      <FestaDetailModal
        reservaId={viewingReservaId}
        onClose={() => setViewingReservaId(null)}
        hidePrices={isCacifos}
      />

      {/* Preencher Cacifos Modal (modo CACIFOS) */}
      <PreencherCacifosModal
        reservaId={preencherCacifosReservaId}
        onClose={() => setPreencherCacifosReservaId(null)}
      />

      {/* Histórico Modal */}
      {historicoReserva && (
        <HistoricoModal reserva={historicoReserva} onClose={() => setHistoricoReserva(null)} />
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

      {/* Finalizar Resumo Modal */}
      {finalizarModal && (
        <ConcluirResumoModal
          isOpen={!!finalizarModal}
          onClose={() => setFinalizarModal(null)}
          onConfirm={confirmFinalizar}
          isConfirming={finalizarReserva.isPending}
          titulo="Finalizar Festa"
          entidadeNome={getAniversarianteNome(finalizarModal)}
          localNome={finalizarModal.local?.nome}
          inicioEm={finalizarModal.inicioEm}
          fimPrevisto={finalizarModal.fimPrevisto}
          duracaoMinutos={finalizarModal.duracaoMinutos}
          custoBase={Number(finalizarModal.valorPago ?? 0)}
        />
      )}

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

