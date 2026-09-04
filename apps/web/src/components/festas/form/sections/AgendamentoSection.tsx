"use client";

import { MapPin } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
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
}: AgendamentoSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FestaFormData>();
  const horario = watch("horario");
  const duracao = watch("duracaoMinutos");
  const localId = watch("localId");
  const cor = watch("cor");

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
