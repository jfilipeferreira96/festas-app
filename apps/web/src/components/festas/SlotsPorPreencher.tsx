"use client";

import React, { useCallback } from "react";
import { Plus, Clock } from "lucide-react";
import type { SlotDia } from "@/lib/api/slotsHorario";
import type { FestaFormInitialValues } from "./form/FestaForm";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";

interface SlotsPorPreencherProps {
  /** Data do dia mostrado (YYYY-MM-DD) */
  data: string;
  /** Slots do dia (inclui ocupado/festa) */
  slots: SlotDia[];
  /** Cores já usadas no dia */
  coresUsadas: string[];
  /** Callback ao clicar "Preencher" */
  onPreencher: (initialValues: FestaFormInitialValues) => void;
}

function addMinutosToTime(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

function findAvailableColor(coresUsadas: string[], preferida?: string | null): string {
  const PALETA = ["#0095C8", "#5CBE4A", "#FCE12D", "#F59253", "#E54796", "#00A68A", "#993B98", "#8A8E91"];
  if (preferida && !coresUsadas.includes(preferida)) return preferida;
  for (const c of PALETA) {
    if (!coresUsadas.includes(c)) return c;
  }
  return PALETA[0];
}

function slotLabel(horaInicio: string): string {
  const h = Number(horaInicio.split(":")[0]);
  if (h < 12) return "Manhã";
  if (h < 18) return "Tarde";
  return "Noite";
}

/** Secção que mostra os slots horários vazios do dia com botão "Preencher". */
const SlotsPorPreencher: React.FC<SlotsPorPreencherProps> = React.memo(
  ({ data, slots, coresUsadas, onPreencher }) => {
    const vazios = slots.filter((s) => !s.ocupado);

    const handlePreencher = useCallback(
      (slot: SlotDia) => {
        const valores: FestaFormInitialValues = {
          data,
          horario: slot.horaInicio,
          duracaoMinutos: slot.duracaoMin,
          horaLanche: slot.horaLancheDefault || undefined,
          cor: findAvailableColor(coresUsadas, slot.corDefault),
          salaLancheId: slot.salaLancheId || undefined,
        };
        onPreencher(valores);
      },
      [data, coresUsadas, onPreencher],
    );

    if (vazios.length === 0) return null;

    return (
      <div className="mt-4 mb-6 p-4 rounded-xl bg-white border border-border shadow-theme-xs no-print">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-text-muted" />
          <h3 className="text-sm font-semibold text-text-secondary">
            Slots por preencher
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-orange-100 text-accent-orange-600">
            {vazios.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {vazios.map((slot) => (
            <button
              key={slot.slotId}
              type="button"
              onClick={() => handlePreencher(slot)}
              className="group flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/50 transition-all duration-200 text-left"
            >
              <FestaColorDot
                color={findAvailableColor(coresUsadas, slot.corDefault)}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {slot.horaInicio}–{addMinutosToTime(slot.horaInicio, slot.duracaoMin)}
                </p>
                <p className="text-xs text-text-muted">
                  {slotLabel(slot.horaInicio)} · Slot vazio
                </p>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={13} />
                Preencher
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  },
);

SlotsPorPreencher.displayName = "SlotsPorPreencher";
export default SlotsPorPreencher;
