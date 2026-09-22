"use client";

import { Utensils } from "lucide-react";
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
  /** Sala de lanche assumida do slot (SalaLanche) - só display. */
  salaLancheNome: string | null;
  horarioCustom: boolean;
  onToggleHorarioCustom: (v: boolean) => void;
  isAdmin: boolean;
  onSelectSlot: (horaInicio: string) => void;
  dataInicial: string;
  /** Plano do dia (semana vs fim-de-semana) para o chip de capacidade. */
  planoTexto: string | null;
}

export default function AgendamentoSection({
  slotOptions,
  salaLancheNome,
  horarioCustom,
  onToggleHorarioCustom,
  isAdmin,
  onSelectSlot,
  dataInicial,
  planoTexto,
}: AgendamentoSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FestaFormData>();
  const horario = watch("horario");
  const duracao = watch("duracaoMinutos");
  // Hora fora dos slots (festa criada em modo personalizado): para não-admins
  // o valor é mostrado read-only em vez do select de slots - a hora guardada
  // nunca se perde, mas também não pode ser alterada por quem não é admin.
  const foraDosSlots = !!horario && !horarioCustom && !slotOptions.some((o) => o.value === horario);
  const mostraHoraManual = horarioCustom || foraDosSlots;
  // Hora do lanche e sala do lanche: definidas pelo slot e BLOQUEADAS (21/09/2026) -
  // mexe-se na configuração do slot, não na festa.

  return (
    <div className="space-y-4">
      {/* Linha única: Data | Horário | Hora do Lanche | Sala do Lanche */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
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
        <div>
          <FieldLabel required>Horário</FieldLabel>
          {mostraHoraManual ? (
            <InputField
              type="time"
              {...register("horario")}
              readOnly={!isAdmin}
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
          {errors.horario && !mostraHoraManual && (
            <p className="mt-1 text-xs text-error-500">{errors.horario.message}</p>
          )}
          {!mostraHoraManual && planoTexto && (
            <p className="mt-1 text-[11px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded inline-block">
              {planoTexto}
            </p>
          )}
        </div>
        <div>
          <FieldLabel>Hora do Lanche</FieldLabel>
          <InputField
            type="time"
            {...register("horaLanche")}
            readOnly
            hint="Definida pelo slot configurado"
          />
        </div>
        <div>
          <FieldLabel className="flex items-center gap-1">
            <Utensils size={12} /> Sala do Lanche
          </FieldLabel>
          <InputField value={salaLancheNome ?? ""} placeholder="-" readOnly />
          <p className="mt-1 text-[11px] text-text-muted">Definida pelo slot configurado.</p>
        </div>
        {mostraHoraManual && (
          <div>
            <FieldLabel required>Duração</FieldLabel>
            <Select
              options={DURACAO_FESTA_OPTIONS}
              placeholder="Seleccionar"
              value={String(duracao ?? 120)}
              disabled={!isAdmin}
              onChange={(val) => setValue("duracaoMinutos", Number(val), { shouldValidate: true })}
            />
          </div>
        )}
      </div>

      {/* Pessoas: Nº Previstas | Nº Confirmadas | Total de Crianças */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <FieldLabel required>Nº Crianças Previstas</FieldLabel>
          <InputField
            type="number"
            min={1}
            max={100}
            {...register("previsaoCriancas", { valueAsNumber: true })}
            error={!!errors.previsaoCriancas}
            hint={errors.previsaoCriancas?.message}
          />
        </div>
        <div>
          <FieldLabel>Nº Confirmadas</FieldLabel>
          <InputField
            type="number"
            min={0}
            max={100}
            placeholder="Opcional"
            {...register("numCriancasConfirmadas", { valueAsNumber: true })}
          />
        </div>
        <div>
          <FieldLabel>Total de Crianças</FieldLabel>
          <InputField
            type="number"
            min={1}
            max={100}
            placeholder="Opcional"
            {...register("numCriancasTotal", { valueAsNumber: true })}
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
      {!isAdmin && slotOptions.length === 0 && !foraDosSlots && (
        <span className="text-xs text-text-muted">
          Sem slots configurados para este dia - contacte a administração.
        </span>
      )}
    </div>
  );
}
