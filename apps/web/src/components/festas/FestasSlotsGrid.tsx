"use client";

import React, { useMemo } from "react";
import { Clock, Plus, Users, MapPin } from "lucide-react";
import { useSlotsDia } from "@/hooks/use-slots-horario";
import type { SlotDia, FestaSemSlot } from "@/lib/api/slotsHorario";
import { FESTA_COLORS } from "@/components/ui/FestaColorPicker";
import type { FestaFormInitialValues } from "./FestaForm";

interface FestasSlotsGridProps {
  /** Data no formato YYYY-MM-DD */
  data: string;
  /** Callback quando se clica num slot vazio (abre FestaForm com valores pré-preenchidos) */
  onSlotClick: (initialValues: FestaFormInitialValues) => void;
}

/** Adiciona minutos a uma string "HH:MM" e retorna "HH:MM" */
function addMinutosToTime(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutos;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

/** Encontra a primeira cor disponível (não usada por outras festas do dia) */
function findAvailableColor(coresUsadas: string[]): string {
  for (const c of FESTA_COLORS) {
    if (!coresUsadas.includes(c.value)) return c.value;
  }
  return FESTA_COLORS[0].value;
}

/** Calcula a hora sugerida do lanche (início + 60 min) */
function calcHoraLanche(horaInicio: string): string {
  return addMinutosToTime(horaInicio, 60);
}

// ── Cartão de slot individual ──────────────────────────────────
const SlotCard = React.memo(function SlotCard({
  slot,
  coresUsadas,
  onSlotClick,
}: {
  slot: SlotDia;
  coresUsadas: string[];
  onSlotClick: (initialValues: FestaFormInitialValues) => void;
}) {
  const handleClick = React.useCallback(() => {
    if (slot.ocupado) return;
    onSlotClick({
      horario: slot.horaInicio,
      duracaoMinutos: slot.duracaoMin,
      horaLanche: calcHoraLanche(slot.horaInicio),
      cor: findAvailableColor(coresUsadas),
    });
  }, [slot, coresUsadas, onSlotClick]);

  const horaFim = addMinutosToTime(slot.horaInicio, slot.duracaoMin);

  if (slot.ocupado && slot.festa) {
    const f = slot.festa;
    return (
      <div
        className="relative flex-shrink-0 w-56 rounded-xl border-2 overflow-hidden bg-white shadow-theme-xs transition-all"
        style={{ borderColor: f.cor ?? "#E5E7EB" }}
      >
        {/* Faixa de cor no topo */}
        <div className="h-2 w-full" style={{ backgroundColor: f.cor ?? "#E5E7EB" }} />
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
              <Clock size={12} />
              {slot.horaInicio}–{horaFim}
            </span>
            {f.cor && (
              <span
                className="inline-block w-4 h-4 rounded-full border border-gray-200"
                style={{ backgroundColor: f.cor }}
                title="Cor da pulseira"
              />
            )}
          </div>
          <p className="text-sm font-semibold text-text-primary truncate" title={f.nome}>
            {f.nome}
          </p>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {f.numCriancas} crianças
            </span>
            {f.localNome && (
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                {f.localNome}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Slot vazio — clicável
  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 w-56 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 hover:border-brand-400 hover:bg-brand-50/30 transition-all duration-200 group p-3 text-left"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
          <Clock size={12} />
          {slot.horaInicio}–{horaFim}
        </span>
      </div>
      <div className="flex flex-col items-center justify-center py-3 gap-1">
        <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
          <Plus size={18} className="text-gray-400 group-hover:text-brand-500 transition-colors" />
        </div>
        <span className="text-xs text-gray-400 group-hover:text-brand-500 font-medium transition-colors">
          Disponível
        </span>
      </div>
    </button>
  );
});

// ── Cartão de festa sem slot (horário custom) ──────────────────
const FestaSemSlotCard = React.memo(function FestaSemSlotCard({ festa }: { festa: FestaSemSlot }) {
  const horaFim = addMinutosToTime(festa.horario, festa.duracaoMinutos);
  return (
    <div
      className="relative flex-shrink-0 w-56 rounded-xl border-2 overflow-hidden bg-white shadow-theme-xs"
      style={{ borderColor: festa.cor ?? "#E5E7EB" }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: festa.cor ?? "#E5E7EB" }} />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
            <Clock size={12} />
            {festa.horario}–{horaFim}
          </span>
          <span className="text-[10px] text-text-muted bg-gray-100 px-1.5 py-0.5 rounded">Custom</span>
        </div>
        <p className="text-sm font-semibold text-text-primary truncate" title={festa.nome}>
          {festa.nome}
        </p>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {festa.numCriancas} crianças
          </span>
          {festa.localNome && (
            <span className="flex items-center gap-1">
              <MapPin size={12} />
              {festa.localNome}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Componente principal ───────────────────────────────────────
export default function FestasSlotsGrid({ data, onSlotClick }: FestasSlotsGridProps) {
  const { data: slotsData, isLoading } = useSlotsDia(data);

  const coresUsadas = useMemo(() => slotsData?.coresUsadas ?? [], [slotsData]);
  const slots = useMemo(() => slotsData?.slots ?? [], [slotsData]);
  const festasSemSlot = useMemo(() => slotsData?.festasSemSlot ?? [], [slotsData]);

  // Wrapper para injetar a data no callback
  const handleSlotClick = useMemo(
    () => (initialValues: FestaFormInitialValues) => {
      onSlotClick({ ...initialValues, data });
    },
    [data, onSlotClick],
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-4 py-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-56 h-28 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 text-text-muted">
        <Clock size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Não há slots configurados. Configure os horários em Configurações → Slots de Horário.</p>
      </div>
    );
  }

  const ocupados = slots.filter((s) => s.ocupado).length;

  return (
    <div>
      {/* Resumo */}
      <div className="flex items-center gap-4 mb-3 text-sm">
        <span className="text-text-muted">
          <strong className="text-text-primary">{ocupados}</strong> ocupado{ocupados !== 1 ? "s" : ""}
        </span>
        <span className="text-text-muted">
          <strong className="text-text-primary">{slots.length - ocupados}</strong> disponível{slots.length - ocupados !== 1 ? "eis" : "l"}
        </span>
        {festasSemSlot.length > 0 && (
          <span className="text-text-muted">
            <strong className="text-text-primary">{festasSemSlot.length}</strong> horário{festasSemSlot.length !== 1 ? "s" : ""} custom
          </span>
        )}
      </div>

      {/* Grid horizontal de slots */}
      <div className="flex items-stretch gap-3 overflow-x-auto pb-3 filter-scrollbar">
        {slots.map((slot) => (
          <SlotCard
            key={slot.slotId}
            slot={slot}
            coresUsadas={coresUsadas}
            onSlotClick={handleSlotClick}
          />
        ))}

        {/* Festas com horário custom (não correspondem a slots) */}
        {festasSemSlot.map((festa) => (
          <FestaSemSlotCard key={festa.id} festa={festa} />
        ))}
      </div>

      <p className="text-xs text-text-muted mt-2">
        💡 Clique num slot disponível para criar uma festa com horário e cor pré-preenchidos.
      </p>
    </div>
  );
}
