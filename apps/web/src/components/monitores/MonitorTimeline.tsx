"use client";

import React, { useMemo } from "react";
import { Clock, UserCog } from "lucide-react";
import type { AlocacaoMonitor } from "@/lib/api/alocacaoMonitor";
import { minutosParaHora, formatarIntervalo } from "@/lib/api/alocacaoMonitor";
import { corPorId } from "@/lib/local-cores";

const TOTAL_MINUTES = 24 * 60; // 1440

// Marcadores de hora no cabeçalho (a cada 2h)
const HOUR_MARKERS = Array.from({ length: 13 }, (_, i) => i * 2); // 0,2,4,...,24

interface MonitorTimelineProps {
  alocacoes: AlocacaoMonitor[];
  onEdit?: (alocacao: AlocacaoMonitor) => void;
  loading?: boolean;
}

export default function MonitorTimeline({ alocacoes, onEdit, loading }: MonitorTimelineProps) {
  // Agrupar por monitor (ordenado por nome)
  const rows = useMemo(() => {
    const map = new Map<string, { id: string; nome: string; items: AlocacaoMonitor[] }>();
    for (const a of alocacoes) {
      const monitorId = a.monitorId;
      const nome = a.monitor?.nome ?? "—";
      if (!map.has(monitorId)) {
        map.set(monitorId, { id: monitorId, nome, items: [] });
      }
      map.get(monitorId)!.items.push(a);
    }
    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alocacoes]);

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-white p-8 text-center">
        <div className="h-6 w-6 mx-auto mb-3 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
        <p className="text-sm text-text-muted">A carregar escalação...</p>
      </div>
    );
  }

  if (alocacoes.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-12 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-50 mx-auto mb-4">
          <UserCog size={32} className="text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">Nenhuma alocação neste dia</p>
        <p className="text-xs text-text-muted">Use o botão “Adicionar” para escalar um monitor.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-white shadow-theme-xs overflow-hidden">
      {/* Cabeçalho com horas 0–24h */}
      <div className="flex border-b border-border bg-gray-50/60">
        <div className="w-[150px] shrink-0 px-3 py-2.5 text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Monitor
        </div>
        <div className="relative flex-1 min-w-[480px]">
          <div className="flex h-full">
            {HOUR_MARKERS.slice(0, -1).map((h, i) => (
              <div
                key={h}
                className="flex-1 relative py-2.5"
                style={{ borderLeft: i === 0 ? "none" : "1px solid var(--color-border)" }}
              >
                <span className="absolute -top-0.5 left-1.5 text-[10px] font-medium text-text-muted">
                  {String(h).padStart(2, "0")}h
                </span>
              </div>
            ))}
            {/* marcador final 24h */}
            <span className="absolute -top-0.5 right-1.5 text-[10px] font-medium text-text-muted">
              24h
            </span>
          </div>
        </div>
      </div>

      {/* Linhas por monitor */}
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="flex hover:bg-gray-50/40 transition-colors">
            {/* Nome do monitor */}
            <div className="w-[150px] shrink-0 px-3 py-3 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                <UserCog size={13} className="text-primary-500" />
              </div>
              <span className="text-sm font-medium text-text-primary truncate">{row.nome}</span>
            </div>

            {/* Track 0–24h */}
            <div
              className="relative flex-1 min-w-[480px] py-2.5"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, var(--color-border) 0 1px, transparent 1px calc(100% / 24))",
              }}
            >
              {row.items.map((a) => {
                const cor = corPorId(a.localId);
                const left = (a.horaInicio / TOTAL_MINUTES) * 100;
                const width = Math.max(
                  ((a.horaFim - a.horaInicio) / TOTAL_MINUTES) * 100,
                  1.5
                );
                return (
                  <button
                    key={a.id}
                    onClick={() => onEdit?.(a)}
                    title={`${a.local?.nome ?? ""} · ${formatarIntervalo(a.horaInicio, a.horaFim)}${
                      a.observacoes ? ` · ${a.observacoes}` : ""
                    }`}
                    className="absolute top-1.5 bottom-1.5 rounded-md text-[11px] font-semibold shadow-sm flex items-center gap-1 px-1.5 overflow-hidden hover:brightness-110 hover:shadow-md transition-all cursor-pointer"
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: cor.bg,
                      color: cor.text,
                    }}
                  >
                    {width > 6 && (
                      <span className="truncate leading-none">
                        {a.local?.nome ?? ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Resumo de horas */}
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-border bg-gray-50/60 text-xs text-text-muted">
        <span className="flex items-center gap-1.5">
          <Clock size={13} />
          {alocacoes.length} {alocacoes.length === 1 ? "alocação" : "alocações"} · {rows.length}{" "}
          {rows.length === 1 ? "monitor" : "monitores"}
        </span>
        <span>Horas: 00h — 24h</span>
      </div>
    </div>
  );
}
