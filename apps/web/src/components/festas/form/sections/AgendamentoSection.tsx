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
  /** Salas de refeições/lanche (Local.isSalaLanche) - as únicas reserváveis. */
  salaOptions: { value: string; label: string }[];
  /** Troca manual da sala de refeições (sincroniza a sala de lanche do slot). */
  onSalaRefeicoesChange: (localId: string) => void;
  /** Aviso quando nenhum local está marcado como sala de refeições. */
  avisoSala: string | null;
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
  salaOptions,
  onSalaRefeicoesChange,
  avisoSala,
  horarioCustom,
  onToggleHorarioCustom,
  isAdmin,
  onSelectSlot,
  dataInicial,
  planoTexto,
}: AgendamentoSectionProps) {
  const { register, setValue, watch, formState: { errors } } = useFormContext<FestaFormData>();
  const data = watch("data");
  const horario = watch("horario");
  const duracao = watch("duracaoMinutos");
  const localId = watch("localId");

  // Hora fora dos slots (festa criada em modo personalizado): para não-admins
  // o valor é mostrado read-only em vez do select de slots - a hora guardada
  // nunca se perde, mas também não pode ser alterada por quem não é admin.
  const foraDosSlots = !!horario && !horarioCustom && !slotOptions.some((o) => o.value === horario);
  const mostraHoraManual = horarioCustom || foraDosSlots;
  // A hora do lanche vem do slot (não pode ser modificada no form). Só no modo
  // personalizado do admin - onde não há slot de onde assumir o default - é
  // que pode ser definida aqui.
  const podeEditarHoraLanche = isAdmin && horarioCustom;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div>
          <FieldLabel>Hora do Lanche</FieldLabel>
          <InputField
            type="time"
            {...register("horaLanche")}
            readOnly={!podeEditarHoraLanche}
            hint={podeEditarHoraLanche ? undefined : "Definida pelo slot configurado"}
          />
        </div>
        <div>
          <FieldLabel required className="flex items-center gap-1">
            <Utensils size={12} /> Sala de Refeições
          </FieldLabel>
          <Select
            options={salaOptions}
            placeholder="Seleccionar"
            value={localId}
            onChange={onSalaRefeicoesChange}
            error={!!errors.localId}
          />
          {errors.localId && <p className="mt-1 text-xs text-error-500">{errors.localId.message}</p>}
          <p className="mt-1 text-[11px] text-text-muted">
            {isAdmin
              ? "Assumida automaticamente do slot; podes trocar se necessário."
              : "Assumida automaticamente do slot."}
          </p>
          {avisoSala && <p className="mt-1 text-[11px] text-accent-orange-700">{avisoSala}</p>}
        </div>
        {/* Cor da Festa removida a pedido do cliente (19/09/2026): a cor passa
            sempre pela pulseira do slot (slot.corDefault, aplicada em
            onSelectSlot). Não é editável à mão. As zonas de brincadeira não são
            reserváveis - a sala da festa é a sala de refeições do plano diário. */}
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
