"use client";

import React, { useMemo, useState } from "react";
import { Cake, Printer } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import LoadingState from "@/components/ui/LoadingState";
import DatePicker from "@/components/form/date-picker";
import { useReservas } from "@/hooks/use-reservas";
import { imprimirBolos } from "@/utils/print-bolos";
import { BOLO_LABELS, BOLOS_NOSSOS, ehBoloNosso } from "@/lib/constants/bolo";
import { toISODate } from "@/lib/format";
import type { Reserva } from "@/lib/api/reservas";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Página de bolos (pedido do cliente, 19/09/2026): lista dos bolos da casa a
 * encomendar, por data. Impressão reutiliza imprimirBolos (já existente).
 */
export default function BolosContent() {
  const [data, setData] = useState(() => toISODate(new Date()));
  const { data: resultado, isLoading } = useReservas({ data });

  const bolos = useMemo(() => {
    const items = resultado?.items ?? [];
    return items
      .filter((r: Reserva) => ehBoloNosso(r.bolo))
      .sort((a: Reserva, b: Reserva) => (a.horario ?? "").localeCompare(b.horario ?? ""));
  }, [resultado]);

  const temBoloPais = useMemo(() => {
    const items = resultado?.items ?? [];
    return items.filter((r: Reserva) => r.bolo && !ehBoloNosso(r.bolo));
  }, [resultado]);

  return (
    <div>
      <PageHeader title="Bolos" subtitle="Bolos da casa a encomendar, por data" />

      {/* Seleção de data + imprimir */}
      <div className="flex items-center gap-3 mt-4 mb-6 flex-wrap">
        <div className="w-52">
          <DatePicker
            id="bolos-data"
            placeholder="Selecionar data"
            defaultDate={data}
            onChange={([date]) => {
              if (date) setData(toISODate(date));
            }}
          />
        </div>
        <Button
          onClick={() => imprimirBolos(resultado?.items ?? [])}
          disabled={bolos.length === 0}
          className="flex items-center gap-2"
        >
          <Printer size={16} />
          Imprimir lista
        </Button>
        <span className="text-sm text-text-muted">
          {bolos.length} {bolos.length === 1 ? "bolo a encomendar" : "bolos a encomendar"}
        </span>
      </div>

      {isLoading ? (
        <div className="bg-surface rounded-[14px] shadow-card border border-border">
          <LoadingState className="h-64" message="A carregar bolos..." />
        </div>
      ) : bolos.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Cake size={36} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-secondary font-medium">Sem bolos da casa neste dia</p>
          <p className="text-xs text-text-muted mt-1">
            Só aparecem aqui os bolos produzidos pela casa (1kg, 2kg, artístico).
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Hora</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Aniversariante(s)</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Bolo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Tema</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-text-muted">Qtd</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted">Sala</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {bolos.map((r: Reserva) => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-semibold text-text-primary whitespace-nowrap">{r.horario}</td>
                  <td className="px-4 py-3 text-text-primary">
                    {r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{BOLO_LABELS[r.bolo as string] ?? r.bolo}</td>
                  <td className="px-4 py-3 text-text-secondary">{r.boloTema || "-"}</td>
                  <td className="px-4 py-3 text-center font-semibold text-text-primary">
                    {r.boloQuantidade ?? 1}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{r.local?.nome ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bolos trazidos pelos pais / a decidir - contexto útil para a cozinha */}
      {temBoloPais.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            Sem encomenda (pais trazem / a decidir) - {temBoloPais.length}
          </p>
          <ul className="text-sm text-text-secondary space-y-1">
            {temBoloPais.map((r: Reserva) => (
              <li key={r.id}>
                <span className="font-medium text-text-primary">{r.horario}</span> ·{" "}
                {r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "-"} —{" "}
                {BOLO_LABELS[r.bolo as string] ?? r.bolo}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
