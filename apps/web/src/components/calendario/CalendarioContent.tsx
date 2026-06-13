"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  DoorOpen,
  UserCog,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  isToday,
} from "date-fns";
import { pt } from "date-fns/locale/pt";
import { PageHeader, StatusBadge } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { useReservas } from "@/hooks/use-reservas";
import { useEntradasLivres } from "@/hooks/use-entrada-livre";
import { useAlocacoes } from "@/hooks/use-alocacoes-monitor";
import type { Reserva } from "@/lib/api/reservas";
import { getAniversarianteNome } from "@/lib/api/reservas";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import type { AlocacaoMonitor } from "@/lib/api/alocacaoMonitor";
import { formatarIntervalo, minutosParaHora } from "@/lib/api/alocacaoMonitor";
import { corPorId } from "@/lib/local-cores";
import type { StatusType } from "@/components/ui";

type ViewMode = "mes" | "semana" | "dia";
type TipoEvento = "festas" | "entradas" | "monitores";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Dia" },
];

const TYPE_OPTIONS: { value: TipoEvento; label: string; icon: React.ReactNode }[] = [
  { value: "festas", label: "Festas", icon: <PartyPopper size={14} /> },
  { value: "entradas", label: "Entradas Livres", icon: <DoorOpen size={14} /> },
  { value: "monitores", label: "Monitores", icon: <UserCog size={14} /> },
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// ── Festas: cores por estado ──
const ESTADO_LABELS: Record<string, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const ESTADO_COLORS: Record<string, string> = {
  RESERVA: "bg-gray-100 text-gray-600",
  CONFIRMADO: "bg-primary-50 text-primary-500",
  EM_CURSO: "bg-accent-green-50 text-accent-green-600",
  CONCLUIDA: "bg-accent-purple-50 text-accent-purple-500",
  CANCELADA: "bg-accent-red-50 text-accent-red-600",
};

// ── Entradas Livres: cores por estado ──
const ENTRADA_ESTADO_LABELS: Record<string, string> = {
  ATIVA: "Ativa",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

const ENTRADA_ESTADO_COLORS: Record<string, string> = {
  ATIVA: "bg-accent-orange-100 text-accent-orange-700",
  CONCLUIDA: "bg-accent-green-50 text-accent-green-600",
  CANCELADA: "bg-accent-red-50 text-accent-red-600",
};

// Evento unificado para o calendário
interface CalendarEvent {
  id: string;
  tipo: TipoEvento;
  dateKey: string; // yyyy-MM-dd
  horario: string; // "HH:MM"
  duracaoMinutos: number;
  titulo: string;
  subtitulo: string;
  className: string; // classes tailwind (bg/text)
  hex?: string; // cor inline (monitores — por local)
  estado?: string; // para badge (festas/entradas)
  raw: Reserva | EntradaLivre | AlocacaoMonitor;
}

// ── Conversores ───────────────────────────────────
function reservaToEvent(r: Reserva): CalendarEvent {
  const rawDate = r.data;
  const key =
    typeof rawDate === "string"
      ? format(parseISO(rawDate), "yyyy-MM-dd")
      : format(rawDate, "yyyy-MM-dd");
  return {
    id: r.id,
    tipo: "festas",
    dateKey: key,
    horario: r.horario,
    duracaoMinutos: r.duracaoMinutos,
    titulo: getAniversarianteNome(r),
    subtitulo: `${r.local?.nome ?? ""} · ${r.numCriancas} crianças`,
    className: ESTADO_COLORS[r.estado] ?? "bg-gray-100 text-gray-600",
    estado: r.estado,
    raw: r,
  };
}

function entradaToEvent(e: EntradaLivre): CalendarEvent {
  const inicio = parseISO(e.inicioEm);
  const key = format(inicio, "yyyy-MM-dd");
  const criancasNomes = (e.criancas ?? []).map((c) => c.nome).join(", ") || "—";
  return {
    id: e.id,
    tipo: "entradas",
    dateKey: key,
    horario: format(inicio, "HH:mm"),
    duracaoMinutos: e.duracaoMinutos,
    titulo: criancasNomes,
    subtitulo: `${e.local?.nome ?? ""} · ${e.encarregadoNome}`,
    className: ENTRADA_ESTADO_COLORS[e.estado] ?? ENTRADA_ESTADO_COLORS.ATIVA,
    estado: e.estado,
    raw: e,
  };
}

function alocacaoToEvent(a: AlocacaoMonitor): CalendarEvent {
  const key = format(parseISO(a.data), "yyyy-MM-dd");
  return {
    id: a.id,
    tipo: "monitores",
    dateKey: key,
    horario: minutosParaHora(a.horaInicio),
    duracaoMinutos: a.horaFim - a.horaInicio,
    titulo: a.monitor?.nome ?? "—",
    subtitulo: a.local?.nome ?? "",
    className: "", // usa hex por local
    hex: corPorId(a.localId).bg,
    raw: a,
  };
}

const MAX_VISIBLE_EVENTS = 3;

export default function CalendarioContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("mes");
  const [tipoEvento, setTipoEvento] = useState<TipoEvento>("festas");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Dados (todas as fontes carregadas; agrupamento no cliente)
  const { data: reservas, isLoading: loadingReservas } = useReservas({ pageSize: 1000 });
  const { data: entradas, isLoading: loadingEntradas } = useEntradasLivres();
  const { data: alocacoes, isLoading: loadingAlocacoes } = useAlocacoes();

  const isLoading = loadingReservas || loadingEntradas || loadingAlocacoes;

  // Agrupar por data — depende do tipo activo
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    const source: CalendarEvent[] =
      tipoEvento === "festas"
        ? (reservas?.items ?? []).map(reservaToEvent)
        : tipoEvento === "entradas"
        ? (entradas ?? []).map(entradaToEvent)
        : (alocacoes ?? []).map(alocacaoToEvent);

    for (const ev of source) {
      if (!ev.dateKey) continue;
      if (!map[ev.dateKey]) map[ev.dateKey] = [];
      map[ev.dateKey].push(ev);
    }
    // Ordenar por horário dentro de cada dia
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.horario.localeCompare(b.horario));
    }
    return map;
  }, [tipoEvento, reservas, entradas, alocacoes]);

  const goToPrevious = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === "mes") return subMonths(prev, 1);
      if (viewMode === "semana") return subWeeks(prev, 1);
      return addDays(prev, -1);
    });
  }, [viewMode]);

  const goToNext = useCallback(() => {
    setCurrentDate((prev) => {
      if (viewMode === "mes") return addMonths(prev, 1);
      if (viewMode === "semana") return addWeeks(prev, 1);
      return addDays(prev, 1);
    });
  }, [viewMode]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const headerLabel = useMemo(() => {
    if (viewMode === "mes") return format(currentDate, "MMMM yyyy", { locale: pt });
    if (viewMode === "semana") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM", { locale: pt })} — ${format(end, "d MMM yyyy", { locale: pt })}`;
    }
    return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: pt });
  }, [currentDate, viewMode]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const handleDayClick = useCallback((date: Date) => setSelectedDate(date), []);
  const handleEventClick = useCallback((ev: CalendarEvent) => setSelectedEvent(ev), []);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[format(selectedDate, "yyyy-MM-dd")] ?? [];
  }, [selectedDate, eventsByDate]);

  const weekHours = useMemo(
    () => Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, "0")}:00`), // 8h–22h
    []
  );

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const dayEvents = useMemo(
    () => eventsByDate[format(currentDate, "yyyy-MM-dd")] ?? [],
    [currentDate, eventsByDate]
  );

  // Legenda dinâmica por tipo
  const legendItems = useMemo(() => {
    if (tipoEvento === "festas") {
      return Object.entries(ESTADO_COLORS).map(([k, c]) => ({ key: k, label: ESTADO_LABELS[k], className: c }));
    }
    if (tipoEvento === "entradas") {
      return Object.entries(ENTRADA_ESTADO_COLORS).map(([k, c]) => ({ key: k, label: ENTRADA_ESTADO_LABELS[k], className: c }));
    }
    return []; // monitores: legenda por local é dinâmica; omitimos aqui
  }, [tipoEvento]);

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="Visão temporal de festas, entradas livres e monitores"
      />

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mt-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={goToPrevious} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-brand-500 text-white shadow-theme-sm"
          >
            Hoje
          </button>
          <button onClick={goToNext} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} />
          </button>
          <h3 className="text-sm font-semibold text-text-primary capitalize ml-2">{headerLabel}</h3>
        </div>

        {/* Seletor de tipo (Festas / Entradas Livres / Monitores) */}
        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto filter-scrollbar max-w-full">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTipoEvento(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                tipoEvento === opt.value
                  ? "bg-brand-500 text-white shadow-theme-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Seletor de vista (Mês / Semana / Dia) */}
        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto filter-scrollbar max-w-full">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setViewMode(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                viewMode === opt.value
                  ? "bg-brand-500 text-white shadow-theme-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Views */}
      <div className="bg-surface rounded-[14px] shadow-card border border-border overflow-hidden">
        {/* Legenda */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-gray-50/50">
          <span className="text-xs font-medium text-text-muted">Legenda:</span>
          {legendItems.length > 0 ? (
            legendItems.map((item) => (
              <span
                key={item.key}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${item.className}`}
              >
                {item.label}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-text-muted">Cada cor representa um local (ver detalhe).</span>
          )}
        </div>

        {isLoading ? (
          <div className="p-16 text-center">
            <div className="h-7 w-7 mx-auto mb-3 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
            <p className="text-xs text-text-muted">A carregar...</p>
          </div>
        ) : viewMode === "mes" ? (
          <MonthView
            days={monthDays}
            currentDate={currentDate}
            eventsByDate={eventsByDate}
            onDayClick={handleDayClick}
            onEventClick={handleEventClick}
            selectedDate={selectedDate}
          />
        ) : viewMode === "semana" ? (
          <WeekView
            weekStart={weekStart}
            weekHours={weekHours}
            eventsByDate={eventsByDate}
            onEventClick={handleEventClick}
          />
        ) : (
          <DayView currentDate={currentDate} dayEvents={dayEvents} onEventClick={handleEventClick} />
        )}
      </div>

      {/* Selected Day Panel (Month view) */}
      {viewMode === "mes" && selectedDate && (
        <div className="mt-4 bg-surface rounded-[14px] shadow-card border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-text-primary">
              {format(selectedDate, "d 'de' MMMM", { locale: pt })}
            </h4>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
            >
              Fechar
            </button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">Sem registos neste dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map((ev) => (
                <EventRow key={ev.id} event={ev} onClick={handleEventClick} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEvent && (
        <Modal isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)}>
          <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        </Modal>
      )}
    </div>
  );
}

// ── Linha de evento (day panel + day view) ─────────
function EventRow({ event, onClick }: { event: CalendarEvent; onClick: (e: CalendarEvent) => void }) {
  return (
    <div
      onClick={() => onClick(event)}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm font-semibold text-primary-500 shrink-0">{event.horario}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{event.titulo}</p>
          <p className="text-xs text-text-muted truncate">{event.subtitulo}</p>
        </div>
      </div>
      {event.estado ? (
        <StatusBadge status={event.estado as StatusType}>
          {event.tipo === "festas"
            ? ESTADO_LABELS[event.estado] ?? event.estado
            : ENTRADA_ESTADO_LABELS[event.estado] ?? event.estado}
        </StatusBadge>
      ) : event.hex ? (
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ backgroundColor: event.hex }}
        >
          {event.subtitulo || "Monitor"}
        </span>
      ) : null}
    </div>
  );
}

// ── Month View ────────────────────────────────────
function MonthView({
  days,
  currentDate,
  eventsByDate,
  onDayClick,
  onEventClick,
  selectedDate,
}: {
  days: Date[];
  currentDate: Date;
  eventsByDate: Record<string, CalendarEvent[]>;
  onDayClick: (date: Date) => void;
  onEventClick: (ev: CalendarEvent) => void;
  selectedDate: Date | null;
}) {
  return (
    <div>
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-text-secondary py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, currentDate);
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateKey] ?? [];
          const count = dayEvents.length;
          const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const remaining = count - MAX_VISIBLE_EVENTS;
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const today = isToday(day);

          return (
            <div
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[120px] p-1.5 border-b border-r border-border cursor-pointer transition-colors hover:bg-gray-50 ${
                !inMonth ? "bg-gray-50/50" : ""
              } ${isSelected ? "ring-2 ring-inset ring-primary-500" : ""}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium ${
                    today
                      ? "bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center"
                      : inMonth
                      ? "text-text-primary"
                      : "text-text-muted"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              {inMonth && visible.length > 0 && (
                <div className="space-y-0.5">
                  {visible.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(ev);
                      }}
                      className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate font-medium text-white`}
                      style={
                        ev.hex
                          ? { backgroundColor: ev.hex }
                          : { backgroundColor: undefined }
                      }
                    >
                      <span className={ev.hex ? "" : `${ev.className} !text-inherit`}>
                        {ev.hex && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle"
                            style={{ backgroundColor: "#ffffffcc" }}
                          />
                        )}
                        {ev.horario} {ev.titulo}
                      </span>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <span className="text-[10px] text-text-muted font-medium pl-1.5">+{remaining} mais</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────
function WeekView({
  weekStart,
  weekHours,
  eventsByDate,
  onEventClick,
}: {
  weekStart: Date;
  weekHours: string[];
  eventsByDate: Record<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-2 text-xs text-text-muted text-center">Hora</div>
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`p-2 text-center text-xs font-medium ${
                isToday(day) ? "text-primary-500 font-bold" : "text-text-secondary"
              }`}
            >
              <div>{WEEKDAYS[i]}</div>
              <div className="text-sm">{format(day, "d")}</div>
            </div>
          ))}
        </div>
        {weekHours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-border last:border-0">
            <div className="p-2 text-xs text-text-muted text-center">{hour}</div>
            {weekDays.map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate[dateKey] ?? [];
              const hourEvents = dayEvents.filter((r) => r.horario.startsWith(hour.split(":")[0]));
              return (
                <div key={i} className="p-1 min-h-[40px] border-r border-border last:border-0">
                  {hourEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium cursor-pointer hover:opacity-80 ${
                        ev.hex ? "" : ev.className
                      }`}
                      style={ev.hex ? { backgroundColor: ev.hex, color: "#fff" } : undefined}
                    >
                      {ev.horario} {ev.titulo}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────
function DayView({
  currentDate,
  dayEvents,
  onEventClick,
}: {
  currentDate: Date;
  dayEvents: CalendarEvent[];
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const sorted = useMemo(
    () => [...dayEvents].sort((a, b) => a.horario.localeCompare(b.horario)),
    [dayEvents]
  );

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-text-primary mb-3">
        {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
      </h4>
      {sorted.length === 0 ? (
        <p className="text-xs text-text-muted py-8 text-center">Sem registos neste dia.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((ev) => (
            <EventRow key={ev.id} event={ev} onClick={onEventClick} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail Modal ──────────────────────────────────
function EventDetailModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const title =
    event.tipo === "festas"
      ? "Detalhes da Festa"
      : event.tipo === "entradas"
      ? "Detalhes da Entrada Livre"
      : "Detalhes da Alocação";

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">{title}</h2>
      <div className="space-y-3">
        {event.tipo === "festas" && <FestaDetail r={event.raw as Reserva} />}
        {event.tipo === "entradas" && <EntradaDetail e={event.raw as EntradaLivre} />}
        {event.tipo === "monitores" && <AlocacaoDetail a={event.raw as AlocacaoMonitor} />}
      </div>
      <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-gray-50 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-28 shrink-0">{label}:</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

function FestaDetail({ r }: { r: Reserva }) {
  return (
    <>
      <DetailRow label="Aniversariante" value={getAniversarianteNome(r)} />
      <DetailRow label="Encarregado" value={r.cliente?.nome ?? "—"} />
      <DetailRow label="Data" value={format(parseISO(r.data), "d/MM/yyyy")} />
      <DetailRow
        label="Horário"
        value={`${r.horario} (${Math.floor(r.duracaoMinutos / 60)}h${
          r.duracaoMinutos % 60 > 0 ? (r.duracaoMinutos % 60).toString().padStart(2, "0") : ""
        })`}
      />
      <DetailRow label="Sala" value={r.local?.nome ?? "—"} />
      <DetailRow label="Crianças" value={String(r.numCriancas)} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted w-28 shrink-0">Estado:</span>
        <StatusBadge status={r.estado as StatusType}>{ESTADO_LABELS[r.estado] ?? r.estado}</StatusBadge>
      </div>
    </>
  );
}

function EntradaDetail({ e }: { e: EntradaLivre }) {
  const criancas = (e.criancas ?? []).map((c) => c.nome).join(", ") || "—";
  return (
    <>
      <DetailRow label="Crianças" value={criancas} />
      <DetailRow label="Encarregado" value={e.encarregadoNome} />
      <DetailRow label="Contacto" value={e.encarregadoTelefone} />
      <DetailRow
        label="Início"
        value={format(parseISO(e.inicioEm), "d/MM/yyyy HH:mm")}
      />
      <DetailRow label="Duração" value={`${e.duracaoMinutos} min`} />
      <DetailRow label="Local" value={e.local?.nome ?? "—"} />
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted w-28 shrink-0">Estado:</span>
        <StatusBadge status={e.estado as StatusType}>
          {ENTRADA_ESTADO_LABELS[e.estado] ?? e.estado}
        </StatusBadge>
      </div>
    </>
  );
}

function AlocacaoDetail({ a }: { a: AlocacaoMonitor }) {
  return (
    <>
      <DetailRow label="Monitor" value={a.monitor?.nome ?? "—"} />
      <DetailRow label="Local" value={a.local?.nome ?? "—"} />
      <DetailRow label="Data" value={format(parseISO(a.data), "d/MM/yyyy")} />
      <DetailRow label="Horário" value={formatarIntervalo(a.horaInicio, a.horaFim)} />
      {a.observacoes ? <DetailRow label="Observações" value={a.observacoes} /> : null}
    </>
  );
}
