"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, addWeeks, subWeeks, parseISO, isToday } from "date-fns";
import { pt } from "date-fns/locale/pt";
import { PageHeader, StatusBadge } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { useReservas } from "@/hooks/use-reservas";
import type { Reserva } from "@/lib/api/reservas";
import { getAniversarianteNome } from "@/lib/api/reservas";
import type { StatusType } from "@/components/ui";

type ViewMode = "mes" | "semana" | "dia";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "mes", label: "Mês" },
  { value: "semana", label: "Semana" },
  { value: "dia", label: "Dia" },
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const ESTADO_LABELS: Record<string, string> = {
  RESERVA: "Reserva",
  CONFIRMADO: "Confirmado",
  EM_CURSO: "Em curso",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

// Cores por estado — mesmas classes do StatusBadge para consistência visual
const ESTADO_COLORS: Record<string, string> = {
  RESERVA: "bg-gray-100 text-gray-600",
  CONFIRMADO: "bg-primary-50 text-primary-500",
  EM_CURSO: "bg-accent-green-50 text-accent-green-600",
  CONCLUIDA: "bg-accent-purple-50 text-accent-purple-500",
  CANCELADA: "bg-accent-red-50 text-accent-red-600",
};

export default function CalendarioContent() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("mes");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null);

  const { data: reservas, isLoading } = useReservas({ pageSize: 1000 });

  // Group reservas by date — normalize r.data (ISO string) to "yyyy-MM-dd"
  const reservasByDate = useMemo(() => {
    const map: Record<string, Reserva[]> = {};
    if (!reservas?.items) return map;
    for (const r of reservas.items) {
      const rawDate = r.data;
      if (!rawDate) continue;
      const key = format(typeof rawDate === "string" ? parseISO(rawDate) : rawDate, "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [reservas]);

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

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const headerLabel = useMemo(() => {
    if (viewMode === "mes") {
      return format(currentDate, "MMMM yyyy", { locale: pt });
    }
    if (viewMode === "semana") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, "d MMM", { locale: pt })} — ${format(end, "d MMM yyyy", { locale: pt })}`;
    }
    return format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: pt });
  }, [currentDate, viewMode]);

  // Month view data
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

  const handleDayClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleReservaClick = useCallback(
    (reserva: Reserva) => {
      setSelectedReserva(reserva);
    },
    []
  );

  // Selected day reservas
  const selectedDayReservas = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return reservasByDate[key] ?? [];
  }, [selectedDate, reservasByDate]);

  // Week view hours
  const weekHours = useMemo(() => {
    const hours: string[] = [];
    for (let h = 8; h <= 22; h++) {
      hours.push(`${h.toString().padStart(2, "0")}:00`);
    }
    return hours;
  }, []);

  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );

  // Day view reservas
  const dayReservas = useMemo(() => {
    const key = format(currentDate, "yyyy-MM-dd");
    return reservasByDate[key] ?? [];
  }, [currentDate, reservasByDate]);

  return (
    <div>
      <PageHeader
        title="Calendário"
        subtitle="Visão temporal de reservas e festas"
      />

      {/* Controls */}
      <div className="flex items-center justify-between gap-3 mt-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevious}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 bg-brand-500 text-white shadow-theme-sm"
          >
            Hoje
          </button>
          <button
            onClick={goToNext}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <h3 className="text-sm font-semibold text-text-primary capitalize ml-2">
            {headerLabel}
          </h3>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
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
      </div>

      {/* Calendar Views */}
      <div className="bg-surface rounded-[14px] shadow-card border border-border overflow-hidden">
        {/* Legenda de estados */}
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border bg-gray-50/50">
          <span className="text-xs font-medium text-text-muted">Legenda:</span>
          {Object.entries(ESTADO_COLORS).map(([estado, colorClass]) => (
            <span
              key={estado}
              className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full ${colorClass}`}
            >
              {ESTADO_LABELS[estado]}
            </span>
          ))}
        </div>
        {viewMode === "mes" && (
          <MonthView
            days={monthDays}
            currentDate={currentDate}
            reservasByDate={reservasByDate}
            onDayClick={handleDayClick}
            selectedDate={selectedDate}
          />
        )}
        {viewMode === "semana" && (
          <WeekView
            weekStart={weekStart}
            weekHours={weekHours}
            reservasByDate={reservasByDate}
            onReservaClick={handleReservaClick}
          />
        )}
        {viewMode === "dia" && (
          <DayView
            currentDate={currentDate}
            dayReservas={dayReservas}
            onReservaClick={handleReservaClick}
          />
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
          {selectedDayReservas.length === 0 ? (
            <p className="text-xs text-text-muted py-4 text-center">
              Sem reservas neste dia.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedDayReservas.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleReservaClick(r)}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary-500">
                        {r.horario}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {getAniversarianteNome(r)}
                        </p>
                        <p className="text-xs text-text-muted">
                          {r.local.nome} · {r.numCriancas} crianças
                        </p>
                      </div>
                  </div>
                  <StatusBadge status={r.estado as StatusType}>
                    {ESTADO_LABELS[r.estado] ?? r.estado}
                  </StatusBadge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reserva Detail Modal */}
      {selectedReserva && (
        <Modal
          isOpen={!!selectedReserva}
          onClose={() => setSelectedReserva(null)}
        >
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              Detalhes da Reserva
            </h2>
            <div className="space-y-3">
              <DetailRow
                label="Aniversariante"
                value={getAniversarianteNome(selectedReserva)}
              />
              <DetailRow
                label="Encarregado"
                value={selectedReserva.cliente.nome}
              />
              <DetailRow label="Contacto" value={selectedReserva.cliente.telefone} />
              <DetailRow
                label="Data"
                value={format(parseISO(selectedReserva.data), "d/MM/yyyy")}
              />
              <DetailRow
                label="Horário"
                value={`${selectedReserva.horario} (${Math.floor(selectedReserva.duracaoMinutos / 60)}h${selectedReserva.duracaoMinutos % 60 > 0 ? `${(selectedReserva.duracaoMinutos % 60).toString().padStart(2, "0")}` : ""})`}
              />
              <DetailRow
                label="Sala"
                value={selectedReserva.local.nome}
              />
              <DetailRow
                label="Crianças"
                value={String(selectedReserva.numCriancas)}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted w-24">Estado:</span>
                <StatusBadge status={selectedReserva.estado as StatusType}>
                  {ESTADO_LABELS[selectedReserva.estado] ??
                    selectedReserva.estado}
                </StatusBadge>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Max events shown per day cell in month view
const MAX_VISIBLE_EVENTS = 3;

// Month View
function MonthView({
  days,
  currentDate,
  reservasByDate,
  onDayClick,
  selectedDate,
}: {
  days: Date[];
  currentDate: Date;
  reservasByDate: Record<string, Reserva[]>;
  onDayClick: (date: Date) => void;
  selectedDate: Date | null;
}) {
  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-semibold text-text-secondary py-2"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, currentDate);
          const dateKey = format(day, "yyyy-MM-dd");
          const dayReservas = reservasByDate[dateKey] ?? [];
          const count = dayReservas.length;
          const visibleReservas = dayReservas.slice(0, MAX_VISIBLE_EVENTS);
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
              {inMonth && visibleReservas.length > 0 && (
                <div className="space-y-0.5">
                  {visibleReservas.map((r) => (
                    <div
                      key={r.id}
                      className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-md truncate font-medium ${ESTADO_COLORS[r.estado] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {r.horario} {getAniversarianteNome(r)}
                    </div>
                  ))}
                  {remaining > 0 && (
                    <span className="text-[10px] text-text-muted font-medium pl-1.5">
                      +{remaining} mais
                    </span>
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

// Week View
function WeekView({
  weekStart,
  weekHours,
  reservasByDate,
  onReservaClick,
}: {
  weekStart: Date;
  weekHours: string[];
  reservasByDate: Record<string, Reserva[]>;
  onReservaClick: (reserva: Reserva) => void;
}) {
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-8 border-b border-border">
          <div className="p-2 text-xs text-text-muted text-center">Hora</div>
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={`p-2 text-center text-xs font-medium ${
                isToday(day)
                  ? "text-primary-500 font-bold"
                  : "text-text-secondary"
              }`}
            >
              <div>{WEEKDAYS[i]}</div>
              <div className="text-sm">{format(day, "d")}</div>
            </div>
          ))}
        </div>
        {/* Time rows */}
        {weekHours.map((hour) => (
          <div key={hour} className="grid grid-cols-8 border-b border-border last:border-0">
            <div className="p-2 text-xs text-text-muted text-center">
              {hour}
            </div>
            {weekDays.map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayReservas = reservasByDate[dateKey] ?? [];
              const hourReservas = dayReservas.filter(
                (r) => r.horario.startsWith(hour.split(":")[0])
              );

              return (
                <div
                  key={i}
                  className="p-1 min-h-[40px] border-r border-border last:border-0"
                >
                  {hourReservas.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => onReservaClick(r)}
                      className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium cursor-pointer hover:opacity-80 ${ESTADO_COLORS[r.estado] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {r.horario} {getAniversarianteNome(r)}
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

// Day View
function DayView({
  currentDate,
  dayReservas,
  onReservaClick,
}: {
  currentDate: Date;
  dayReservas: Reserva[];
  onReservaClick: (reserva: Reserva) => void;
}) {
  const sortedReservas = useMemo(
    () => [...dayReservas].sort((a, b) => a.horario.localeCompare(b.horario)),
    [dayReservas]
  );

  return (
    <div className="p-4">
      <h4 className="text-sm font-semibold text-text-primary mb-3">
        {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
      </h4>
      {sortedReservas.length === 0 ? (
        <p className="text-xs text-text-muted py-8 text-center">
          Sem reservas neste dia.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedReservas.map((r) => (
            <div
              key={r.id}
              onClick={() => onReservaClick(r)}
              className="flex items-center gap-4 p-3 rounded-lg border border-border hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="text-center min-w-[60px]">
                <span className="text-lg font-bold text-primary-500">
                  {r.horario}
                </span>
                <p className="text-[10px] text-text-muted">
                  {Math.floor(r.duracaoMinutos / 60)}h
                  {r.duracaoMinutos % 60 > 0
                    ? `${(r.duracaoMinutos % 60).toString().padStart(2, "0")}`
                    : ""}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">
                  {getAniversarianteNome(r)}
                </p>
                <p className="text-xs text-text-muted">
                  {r.local.nome} · {r.numCriancas} crianças ·{" "}
                  {r.cliente.nome}
                </p>
              </div>
              <StatusBadge status={r.estado as StatusType}>
                {ESTADO_LABELS[r.estado] ?? r.estado}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-24 shrink-0">{label}:</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}
