"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Package, Download, LockKeyhole, AlertTriangle, Unlock } from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import DatePicker from "@/components/form/date-picker";
import {
  useCacifos,
  useCacifoContadores,
  useLibertar,
  useCacifosEsquecidos,
  useLibertarTodos,
} from "@/hooks/use-cacifos";
import { useReservas, useReservasAtivas } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import type { Cacifo, EstadoCacifo } from "@/lib/api/cacifos";
import type { StatusType } from "@/components/ui";
import { formatDate } from "@/utils/date";

const ESTADO_STYLES: Record<string, { base: string; hover: string; icon: string }> = {
  LIVRE: {
    base: "bg-accent-green-50 border-accent-green-200 text-accent-green-700",
    hover: "hover:bg-accent-green-100 hover:border-accent-green-300 hover:shadow-md hover:scale-[1.04]",
    icon: "text-accent-green-500",
  },
  OCUPADO: {
    base: "bg-accent-red-50 border-accent-red-200 text-accent-red-700",
    hover: "hover:bg-accent-red-100 hover:border-accent-red-300 hover:shadow-md hover:scale-[1.04]",
    icon: "text-accent-red-500",
  },
  RESERVADO: {
    base: "bg-brand-50 border-brand-200 text-brand-700",
    hover: "hover:bg-brand-100 hover:border-brand-300 hover:shadow-md hover:scale-[1.04]",
    icon: "text-brand-500",
  },
};

const ESTADO_LABELS: Record<string, string> = {
  LIVRE: "Livre",
  OCUPADO: "Ocupado",
  RESERVADO: "Reservado",
};

const FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "LIVRE", label: "Livres" },
  { value: "OCUPADO", label: "Ocupados" },
  { value: "RESERVADO", label: "Reservados" },
];

export default function CacifosContent() {
  const [filtro, setFiltro] = useState("");
  const [selectedCacifo, setSelectedCacifo] = useState<Cacifo | null>(null);
  const [filtroFesta, setFiltroFesta] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  const toast = useToast();

  // Fetch festas for the selected date (for summary bar)
  const { data: reservasData } = useReservas({ data: selectedDate, pageSize: 100 });
  const festas = useMemo(() => reservasData?.items ?? [], [reservasData]);

  // Fetch all active festas (for festa filter dropdown)
  const { data: festasAtivas } = useReservasAtivas();

  const { data: cacifos, isLoading } = useCacifos(
    filtro || filtroFesta
      ? {
          ...(filtro ? { estado: filtro as EstadoCacifo } : {}),
          ...(filtroFesta ? { reservaId: filtroFesta } : {})
        }
      : undefined
  );
  const { data: contadores } = useCacifoContadores();
  const libertar = useLibertar();
  const { data: esquecidos } = useCacifosEsquecidos();
  const libertarTodos = useLibertarTodos();

  const esquecidosList = (esquecidos ?? []) as Array<{
    id: string;
    numero: number;
    estado: string;
    reserva?: { estado?: string; cliente?: { nome?: string | null } | null } | null;
  }>;

  const handleLibertarEsquecidos = useCallback(async () => {
    try {
      const { libertados, falhados } = await libertarTodos.mutateAsync(
        esquecidosList.map((c) => c.id)
      );
      if (falhados === 0) {
        toast.success(`${libertados} cacifo${libertados === 1 ? "" : "s"} libertado${libertados === 1 ? "" : "s"} com sucesso.`);
      } else {
        toast.warning(`${libertados} cacifos libertados, ${falhados} falharam. Tente libertar os restantes individualmente.`);
      }
    } catch {
      toast.handleApiError(undefined, "Não foi possível libertar os cacifos.");
    }
  }, [esquecidosList, libertarTodos, toast]);

  const handleLibertar = useCallback(
    async (id: string) => {
      await libertar.mutateAsync(id);
      setSelectedCacifo(null);
    },
    [libertar]
  );

  const handleExportCSV = useCallback(() => {
    if (!cacifos || cacifos.length === 0) return;

    const headers = ["Número", "Nome", "Estado", "Crianças", "Notas"];
    const rows = cacifos.map((cacifo) => [
      cacifo.numero,
      cacifo.nome ?? "",
      ESTADO_LABELS[cacifo.estado] ?? cacifo.estado,
      cacifo.criancas ?? "—",
      cacifo.notas ?? "—",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cacifos-${selectedDate}.csv`;
    link.click();
  }, [cacifos, selectedDate]);

  // Build festa filter options from active festas
  const festaFilterOptions = useMemo(() => [
    { value: "", label: "Todos os cacifos" },
    ...(festasAtivas ?? []).map((r) => ({
      value: r.id,
      label: r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || r.cliente?.nome || "Festa",
    })),
  ], [festasAtivas]);

  const formattedDate = formatDate(selectedDate);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cacifos"
        subtitle={`Vista geral dos cacifos — ${formattedDate}`}
      />

      {/* Alerta de cacifos esquecidos */}
      {esquecidosList.length > 0 && (
        <div className="p-4 rounded-xl bg-accent-red-50 border border-accent-red-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-accent-red-700">
                  {esquecidosList.length} cacifo{esquecidosList.length === 1 ? "" : "s"} esquecido{esquecidosList.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-accent-red-600">
                  Cacifos ocupados cuja festa já terminou:{" "}
                  {esquecidosList.map((c) => `#${c.numero}`).join(", ")}
                </p>
              </div>
            </div>
            <Button
              onClick={handleLibertarEsquecidos}
              disabled={libertarTodos.isPending}
              loading={libertarTodos.isPending}
              className="bg-accent-red-500 hover:bg-accent-red-600 flex items-center gap-2"
            >
              <Unlock size={16} />
              Libertar todos
            </Button>
          </div>
        </div>
      )}

      {/* Stats + Legend Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-green-50">
            <Package size={20} className="text-accent-green-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Livres</p>
            <p className="text-lg font-bold text-accent-green-600">{contadores?.livres ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-red-50">
            <LockKeyhole size={20} className="text-accent-red-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Ocupados</p>
            <p className="text-lg font-bold text-accent-red-600">{contadores?.ocupados ?? "—"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50">
            <Package size={20} className="text-brand-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Reservados</p>
            <p className="text-lg font-bold text-brand-600">{contadores?.reservados ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="p-4 rounded-xl bg-white border border-border shadow-theme-xs">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Picker */}
            <DatePicker
              id="cacifos-date-picker"
              defaultDate={new Date(selectedDate)}
              onChange={([date]: Date[]) => {
                const iso = date.toISOString().split("T")[0];
                setSelectedDate(iso);
                setFiltroFesta("");
              }}
              className="w-44"
            />

            {/* Estado filter */}
            <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFiltro(opt.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                    filtro === opt.value
                      ? "bg-white text-brand-600 shadow-theme-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Festa filter */}
            <div className="w-55">
              <Select
                options={festaFilterOptions}
                value={filtroFesta}
                onChange={setFiltroFesta}
                placeholder="Filtrar por festa"
              />
            </div>
          </div>

          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-theme-xs"
          >
            <Download size={16} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Festas summary for selected date */}
      {festas.length > 0 && (
        <div className="p-4 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Festas do dia — {formattedDate}
            </p>
            <span className="text-xs text-text-muted bg-gray-50 px-2.5 py-1 rounded-full font-medium">
              {festas.length} {festas.length === 1 ? "festa" : "festas"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {festas.map((festa) => {
              const anvNome = festa.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "—";
              const isFiltered = filtroFesta === festa.id;
              return (
                <button
                  key={festa.id}
                  onClick={() => setFiltroFesta(isFiltered ? "" : festa.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-all duration-200 ${
                    isFiltered
                      ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                      : "bg-white text-text-secondary border-border hover:border-brand-300 hover:text-brand-500 hover:shadow-theme-xs"
                  }`}
                >
                  {festa.cor ? (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/30" style={{ backgroundColor: festa.cor }} />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-gray-200" />
                  )}
                  <span className="font-medium">{anvNome}</span>
                  <span className={`text-[10px] ${isFiltered ? "text-white/70" : "text-text-muted"}`}>
                    {festa.horario} · {festa.local?.nome ?? ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : cacifos && cacifos.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2.5">
          {cacifos.map((cacifo) => {
            const style = ESTADO_STYLES[cacifo.estado] ?? {
              base: "bg-gray-50 border-gray-200 text-gray-500",
              hover: "hover:bg-gray-100 hover:shadow-md hover:scale-[1.04]",
              icon: "text-gray-400",
            };
            return (
              <button
                key={cacifo.id}
                onClick={() => setSelectedCacifo(cacifo)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-200 border relative cursor-pointer active:scale-95 ${style.base} ${style.hover}`}
                title={cacifo.criancas || `Cacifo ${cacifo.numero}`}
              >
                <Package size={14} className={style.icon} />
                <span className="text-xs font-bold mt-0.5">{cacifo.numero}</span>
                {cacifo.estado === "OCUPADO" && cacifo.criancas && (
                  <span className="text-[11px] leading-tight text-center mt-0.5 max-w-[95%] truncate font-medium">
                    {cacifo.criancas}
                  </span>
                )}
                {cacifo.reserva && (
                  <span className="text-[10px] leading-tight text-center mt-0.5 max-w-[95%] truncate opacity-70">
                    {cacifo.reserva.cliente?.nome ?? ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl p-12 shadow-theme-xs border border-border text-center bg-white">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mx-auto mb-4">
            <Package size={32} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary mb-1">
            Nenhum cacifo encontrado
          </p>
          <p className="text-xs text-text-muted">
            Tente alterar os filtros ou a data selecionada.
          </p>
        </div>
      )}

      {/* Cacifo Detail Modal */}
      {selectedCacifo && (
        <Modal
          isOpen={!!selectedCacifo}
          onClose={() => setSelectedCacifo(null)}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                  selectedCacifo.estado === "LIVRE"
                    ? "bg-accent-green-50"
                    : selectedCacifo.estado === "OCUPADO"
                    ? "bg-accent-red-50"
                    : "bg-brand-50"
                }`}>
                  <Package size={20} className={
                    selectedCacifo.estado === "LIVRE"
                      ? "text-accent-green-500"
                      : selectedCacifo.estado === "OCUPADO"
                      ? "text-accent-red-500"
                      : "text-brand-500"
                  } />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Cacifo #{selectedCacifo.numero}
                  </h2>
                  {selectedCacifo.nome && (
                    <p className="text-xs text-text-muted">{selectedCacifo.nome}</p>
                  )}
                </div>
              </div>
              <StatusBadge status={selectedCacifo.estado as StatusType}>
                {ESTADO_LABELS[selectedCacifo.estado] ?? selectedCacifo.estado}
              </StatusBadge>
            </div>

            <div className="space-y-2 mb-5">
              {selectedCacifo.reserva && (
                <>
                  <DetailRow label="Festa" value={selectedCacifo.reserva.cliente?.nome ?? "—"} />
                  <DetailRow label="Sala" value={selectedCacifo.reserva.local?.nome ?? "—"} />
                </>
              )}
              {selectedCacifo.criancas && (
                <DetailRow label="Crianças" value={selectedCacifo.criancas} />
              )}
              {selectedCacifo.notas && (
                <DetailRow label="Notas" value={selectedCacifo.notas} />
              )}
            </div>

            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button
                variant="outline"
                onClick={() => setSelectedCacifo(null)}
              >
                Fechar
              </Button>
              {(selectedCacifo.estado === "OCUPADO" || selectedCacifo.estado === "RESERVADO") && (
                <Button
                  onClick={() => handleLibertar(selectedCacifo.id)}
                  disabled={libertar.isPending}
                  loading={libertar.isPending}
                  className="bg-accent-green-500 hover:bg-accent-green-600"
                >
                  Libertar
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50">
      <span className="text-xs font-medium text-text-muted w-20 shrink-0">{label}</span>
      <span className="text-sm text-text-primary font-medium">{value}</span>
    </div>
  );
}
