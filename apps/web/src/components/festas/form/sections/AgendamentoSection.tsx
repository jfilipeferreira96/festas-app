"use client";

import { AlertTriangle, CheckCircle, MapPin, Search } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { useCheckDisponibilidade } from "@/hooks/use-reservas";
import { toISODate } from "@/lib/format";
import { DURACAO_FESTA_OPTIONS, type FestaFormData } from "../festa-form.schema";

interface AgendamentoSectionProps {
  slotOptions: { value: string; label: string; disabled?: boolean }[];
  salaOptions: { value: string; label: string }[];
  corOptions: { value: string; label: string; color?: string; disabled?: boolean }[];
  horarioCustom: boolean;
  onToggleHorarioCustom: (v: boolean) => void;
  isAdmin: boolean;
  onSelectSlot: (horaInicio: string) => void;
  dataInicial: string;
  /** Id da reserva em edição (excluída da verificação de conflitos). */
  reservaId?: string;
}

export default function AgendamentoSection({
  slotOptions,
  salaOptions,
  corOptions,
  horarioCustom,
  onToggleHorarioCustom,
  isAdmin,
  onSelectSlot,
  dataInicial,
  reservaId,
}: AgendamentoSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FestaFormData>();
  const data = watch("data");
  const horario = watch("horario");
  const duracao = watch("duracaoMinutos");
  const localId = watch("localId");
  const cor = watch("cor");

  // Verificação de disponibilidade (aviso apenas, não bloqueia a submissão)
  const disponibilidade = useCheckDisponibilidade({
    data,
    horario,
    duracaoMinutos: duracao,
    localId,
    excludeId: reservaId,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <FieldLabel required>Data</FieldLabel>
          <DatePicker
            id="festa-data"
            placeholder="Selecionar data"
            defaultDate={dataInicial || undefined}
            onChange={([date]) => {
              if (date) setValue("data", toISODate(date), { shouldValidate: true });
            }}
          />
          {errors.data && <p className="mt-1 text-xs text-error-500">{errors.data.message}</p>}
        </div>
        <div className="flex-1">
          <FieldLabel required>Horário</FieldLabel>
          {horarioCustom ? (
            <InputField
              type="time"
              {...register("horario")}
              error={!!errors.horario}
              hint={errors.horario?.message}
            />
          ) : (
            <Select
              options={slotOptions}
              placeholder="Seleccionar slot"
              value={horario}
              onChange={onSelectSlot}
              error={!!errors.horario}
            />
          )}
          {errors.horario && !horarioCustom && (
            <p className="mt-1 text-xs text-error-500">{errors.horario.message}</p>
          )}
        </div>
        {horarioCustom && (
          <div className="flex-1">
            <FieldLabel required>Duração</FieldLabel>
            <Select
              options={DURACAO_FESTA_OPTIONS}
              placeholder="Seleccionar"
              value={String(duracao ?? 120)}
              onChange={(val) => setValue("duracaoMinutos", Number(val), { shouldValidate: true })}
            />
          </div>
        )}
        {isAdmin && (
          <div className="flex-1">
            <FieldLabel>Hora do Lanche</FieldLabel>
            <InputField type="time" {...register("horaLanche")} />
          </div>
        )}
        <div className="flex-1">
          <FieldLabel required className="flex items-center gap-1">
            <MapPin size={12} /> Sala
          </FieldLabel>
          <Select
            options={salaOptions}
            placeholder="Seleccionar"
            value={localId}
            onChange={(val) => setValue("localId", val, { shouldValidate: true })}
            error={!!errors.localId}
          />
          {errors.localId && <p className="mt-1 text-xs text-error-500">{errors.localId.message}</p>}
        </div>
        <div className="flex-1">
          <FieldLabel>Cor da Festa</FieldLabel>
          <Select
            options={corOptions}
            showColorIndicators
            value={cor || "NONE"}
            onChange={(val) => setValue("cor", val === "NONE" ? "" : val, { shouldDirty: true })}
          />
        </div>
      </div>

      {data && horario && duracao && localId && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => disponibilidade.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors cursor-pointer"
          >
            <Search size={14} /> Verificar disponibilidade
          </button>
          {disponibilidade.isLoading && <span className="text-xs text-text-muted">A verificar...</span>}
          {disponibilidade.data && !disponibilidade.isLoading && (
            disponibilidade.data.disponivel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-50 border border-success-200 text-success-700 text-xs font-medium">
                <CheckCircle size={14} /> Sala disponível neste horário
              </span>
            ) : (
              <div className="flex-1 min-w-full rounded-lg bg-accent-orange-50 border border-accent-orange-200 p-2.5">
                <div className="flex items-center gap-1.5 text-accent-orange-700 text-xs font-semibold">
                  <AlertTriangle size={14} /> Sala ocupada neste horário
                </div>
                <div className="mt-1 space-y-0.5">
                  {disponibilidade.data.conflitos.map((c) => (
                    <p key={c.id} className="text-xs text-accent-orange-700">
                      {c.horario} ({c.duracaoMinutos}min){c.tema ? ` · ${c.tema}` : ""}{c.aniversarianteNome ? ` · ${c.aniversarianteNome}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {isAdmin && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={horarioCustom}
            onChange={onToggleHorarioCustom}
            label="Horário personalizado (fora dos slots)"
          />
          {!horarioCustom && slotOptions.length === 0 && (
            <span className="text-xs text-text-muted">
              Sem slots configurados - active a opção para definir a hora manualmente.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
