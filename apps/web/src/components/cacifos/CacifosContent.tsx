"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Package, Download, Calendar } from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import FormSelect from "@/components/form/Select";
import {
  useCacifos,
  useCacifoContadores,
  useLibertar,
} from "@/hooks/use-cacifos";
import { useReservas } from "@/hooks/use-reservas";
import type { Cacifo, EstadoCacifo } from "@/lib/api/cacifos";
import type { StatusType } from "@/components/ui";
import { formatDate } from "@/utils/date";

const ESTADO_COLORS: Record<string, string> = {
  LIVRE: "bg-accent-green-400 hover:bg-accent-green-500 text-white",
  OCUPADO: "bg-accent-red-400 hover:bg-accent-red-500 text-white",
  RESERVADO: "bg-brand-500 hover:bg-brand-600 text-white",
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

  // Fetch festas for the selected date
  const { data: reservasData } = useReservas({ data: selectedDate, pageSize: 100 });
  const festas = useMemo(() => reservasData?.items ?? [], [reservasData]);

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

  // Build festa filter options from the selected date's festas
  const festaOptions = useMemo(() => [
    { value: "", label: "Todas as festas" },
    ...festas.map((r) => ({
      value: r.id,
      label: r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || r.cliente?.nome || "Festa",
    })),
  ], [festas]);

  const formattedDate = formatDate(selectedDate);

  return (
    <div>
      <PageHeader
        title="Cacifos"
        subtitle={`Vista geral dos cacifos — ${formattedDate}`}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-green-400" />
          <span className="text-xs text-text-secondary">
            Livres ({contadores?.livres ?? "—"})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-red-400" />
          <span className="text-xs text-text-secondary">
            Ocupados ({contadores?.ocupados ?? "—"})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-brand-500" />
          <span className="text-xs text-text-secondary">
            Reservados ({contadores?.reservados ?? "—"})
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date Picker */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 h-11 shadow-theme-xs">
            <Calendar size={15} className="text-text-muted shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setFiltroFesta("");
              }}
              className="h-full bg-transparent text-sm text-text-primary focus:outline-none cursor-pointer"
            />
          </div>

          {/* Estado filter */}
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

          {/* Festa filter */}
          <div className="flex items-center gap-2">
            <FormSelect
              options={festaOptions}
              value={filtroFesta}
              onChange={setFiltroFesta}
              placeholder="Filtrar por festa"
              className="w-55"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs">
          <button
            onClick={() => handleExportCSV()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
          >
            <Download size={16} />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Festas summary for selected date */}
      {festas.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Festas do dia — {formattedDate}
            </p>
            <span className="text-xs text-text-muted bg-gray-50 px-2 py-0.5 rounded-full">
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
        <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-[10px] bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : cacifos && cacifos.length > 0 ? (
        <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
          {cacifos.map((cacifo) => (
            <button
              key={cacifo.id}
              onClick={() => setSelectedCacifo(cacifo)}
              className={`aspect-square rounded-[10px] flex flex-col items-center justify-center transition-all shadow-sm relative ${
                ESTADO_COLORS[cacifo.estado] ?? "bg-gray-200 text-gray-500"
              }`}
              title={cacifo.criancas || `Cacifo ${cacifo.numero}`}
            >
              <Package size={18} />
              <span className="text-[10px] font-bold mt-0.5">{cacifo.numero}</span>
              {cacifo.estado === "OCUPADO" && cacifo.criancas && (
                <span className="text-[7px] leading-tight text-center mt-0.5 max-w-[90%] truncate">
                  {cacifo.criancas}
                </span>
              )}
              {cacifo.reserva && (
                <span className="text-[6px] leading-tight text-center mt-0.5 max-w-[90%] truncate opacity-80">
                  {cacifo.reserva.cliente?.nome ?? ""}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-surface rounded-[14px] p-8 shadow-card border border-border text-center">
          <Package size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-muted">
            Nenhum cacifo encontrado.
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text-primary">
                Cacifo #{selectedCacifo.numero}
                {selectedCacifo.nome && ` — ${selectedCacifo.nome}`}
              </h2>
              <StatusBadge status={selectedCacifo.estado as StatusType}>
                {ESTADO_LABELS[selectedCacifo.estado] ?? selectedCacifo.estado}
              </StatusBadge>
            </div>

            <div className="space-y-3 mb-4">
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

            <div className="flex items-center gap-3">
              {(selectedCacifo.estado === "OCUPADO" || selectedCacifo.estado === "RESERVADO") && (
                <Button
                  onClick={() => handleLibertar(selectedCacifo.id)}
                  disabled={libertar.isPending}
                  className="bg-accent-green-500 hover:bg-accent-green-600"
                >
                  {libertar.isPending ? "A libertar..." : "Libertar"}
                </Button>
              )}
              <button
                onClick={() => setSelectedCacifo(null)}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:bg-gray-50 hover:text-text-primary transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
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
