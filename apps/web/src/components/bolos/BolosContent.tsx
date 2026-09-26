"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Cake, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, format, parseISO, startOfWeek } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, Button } from "@/components/ui";
import LoadingState from "@/components/ui/LoadingState";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import DatePicker from "@/components/form/date-picker";
import { useReservas } from "@/hooks/use-reservas";
import { imprimirBolos } from "@/utils/print-bolos";
import { BOLO_LABELS, ehBoloNosso } from "@/lib/constants/bolo";
import { toISODate } from "@/lib/format";
import type { Reserva } from "@/lib/api/reservas";

/** Dia local (YYYY-MM-DD) de uma reserva, tolerante a date-only ou ISO completo. */
function diaDaReserva(r: Reserva): string {
  return r.data ? toISODate(new Date(r.data)) : "";
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface DiaSemana {
  iso: string;
  data: Date;
  bolos: Reserva[];
  semEncomenda: Reserva[];
}

/**
 * Página de bolos (pedido do cliente, 19/09/2026): bolos da casa a encomendar.
 * Vista de semana inteira, por dia e por festa (21/09/2026).
 */
export default function BolosContent() {
  const [dataRef, setDataRef] = useState(() => toISODate(new Date()));

  // Semana (segunda → domingo) que contém a data de referência
  const inicio = useMemo(
    () => startOfWeek(parseISO(dataRef), { weekStartsOn: 1 }),
    [dataRef]
  );
  const inicioISO = toISODate(inicio);
  const fimISO = toISODate(addDays(inicio, 6));

  const { data: resultado, isLoading } = useReservas({
    dataInicio: inicioISO,
    dataFim: fimISO,
    pageSize: 200,
  });

  const hojeISO = toISODate(new Date());

  const dias = useMemo<DiaSemana[]>(() => {
    const items = (resultado?.items ?? []).filter(
      (r: Reserva) => r.estado !== "CANCELADA"
    );
    return Array.from({ length: 7 }, (_, i) => {
      const data = addDays(inicio, i);
      const iso = toISODate(data);
      const doDia = items
        .filter((r: Reserva) => diaDaReserva(r) === iso)
        .sort((a: Reserva, b: Reserva) => (a.horario ?? "").localeCompare(b.horario ?? ""));
      return {
        iso,
        data,
        bolos: doDia.filter((r: Reserva) => ehBoloNosso(r.bolo)),
        semEncomenda: doDia.filter((r: Reserva) => r.bolo && !ehBoloNosso(r.bolo)),
      };
    });
  }, [resultado, inicio]);

  const totalBolos = useMemo(() => dias.reduce((n, d) => n + d.bolos.length, 0), [dias]);
  const festasDaSemana = useMemo(
    () => dias.flatMap((d) => d.bolos).sort((a, b) => diaDaReserva(a).localeCompare(diaDaReserva(b))),
    [dias]
  );

  const moverSemana = useCallback((semanas: number) => {
    setDataRef((ref) => toISODate(addDays(parseISO(ref), semanas * 7)));
  }, []);

  return (
    <div>
      <PageHeader title="Bolos" subtitle="Bolos da casa a encomendar, por semana" />

      {/* Navegação de semana + imprimir (cartão consistente com "Ir para o dia" das Festas) */}
      <div className="mt-4 mb-6 p-4 rounded-[14px] bg-surface border border-border shadow-card no-print">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="outline" onClick={() => moverSemana(-1)} className="!px-2.5">
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" onClick={() => moverSemana(1)} className="!px-2.5">
              <ChevronRight size={16} />
            </Button>
          </div>
          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
            Semana de {format(inicio, "dd/MM")} a {format(addDays(inicio, 6), "dd/MM")}
          </span>
          <Button variant="outline" onClick={() => setDataRef(toISODate(new Date()))}>
            Hoje
          </Button>
          <div className="w-52">
            <DatePicker
              key={dataRef}
              id="bolos-data"
              placeholder="Ir para data"
              defaultDate={dataRef}
              onChange={([date]) => {
                if (date) setDataRef(toISODate(date));
              }}
            />
          </div>
          <Button
            onClick={() => imprimirBolos(festasDaSemana)}
            disabled={totalBolos === 0}
            className="flex items-center gap-2 ml-auto"
          >
            <Printer size={16} />
            Imprimir semana
          </Button>
          <span className="text-sm text-text-muted">
            {totalBolos} {totalBolos === 1 ? "bolo a encomendar" : "bolos a encomendar"}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-surface rounded-[14px] shadow-card border border-border">
          <LoadingState className="h-64" message="A carregar bolos..." />
        </div>
      ) : (
        <div className="space-y-6">
          {dias.map((dia) => {
            const isHoje = dia.iso === hojeISO;
            return (
              <section key={dia.iso}>
                <div className="flex items-center gap-2 mb-2">
                  <h3
                    className={`text-sm font-semibold ${
                      isHoje ? "text-brand-600" : "text-text-secondary"
                    }`}
                  >
                    {capitalizar(format(dia.data, "EEEE, dd/MM", { locale: pt }))}
                  </h3>
                  {isHoje && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-600">
                      Hoje
                    </span>
                  )}
                  {dia.bolos.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-text-secondary">
                      {dia.bolos.length} {dia.bolos.length === 1 ? "bolo" : "bolos"}
                    </span>
                  )}
                </div>

                {dia.bolos.length === 0 && dia.semEncomenda.length === 0 ? (
                  <p className="text-sm text-text-muted py-2">Sem festas.</p>
                ) : dia.bolos.length === 0 ? (
                  <p className="text-sm text-text-muted py-2">
                    Sem bolos da casa{dia.semEncomenda.length > 0 ? " (só pais trazem / a decidir)" : ""}.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Hora</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Aniversariante(s)</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Bolo</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Tema</th>
                          <th className="text-center px-4 py-2.5 text-xs font-semibold text-text-muted">Qtd</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Sala do Lanche</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-surface">
                        {dia.bolos.map((r: Reserva) => (
                          <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-2.5 font-semibold text-text-primary whitespace-nowrap">
                              <span className="flex items-center gap-2">
                                <FestaColorDot color={r.cor} />
                                {r.horario}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-text-primary">
                              {r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "-"}
                            </td>
                            <td className="px-4 py-2.5 text-text-secondary">{BOLO_LABELS[r.bolo as string] ?? r.bolo}</td>
                            <td className="px-4 py-2.5 text-text-secondary">{r.boloTema || "-"}</td>
                            <td className="px-4 py-2.5 text-center font-semibold text-text-primary">
                              {r.boloQuantidade ?? 1}
                            </td>
                            <td className="px-4 py-2.5 text-text-secondary">{r.salaLanche?.nome ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {dia.semEncomenda.length > 0 && (
                  <p className="text-xs text-text-muted mt-1.5">
                    Sem encomenda:{" "}
                    {dia.semEncomenda
                      .map(
                        (r: Reserva) =>
                          `${r.horario} ${r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "-"} (${
                            BOLO_LABELS[r.bolo as string] ?? r.bolo
                          })`
                      )
                      .join(" · ")}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
