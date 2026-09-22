"use client";

import React, { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import { useMonitores } from "@/hooks/use-monitores";
import { useLocais } from "@/hooks/use-locais";
import { useCreateAlocacao, useUpdateAlocacao } from "@/hooks/use-alocacoes-monitor";
import { horaParaMinutos, minutosParaHora } from "@/lib/api/alocacaoMonitor";
import { isResultadoLote } from "@/lib/api/alocacaoMonitor";
import { useToast } from "@/hooks/use-toast";
import { corPorId } from "@/lib/local-cores";
import type { AlocacaoMonitor } from "@/lib/api/alocacaoMonitor";
import { toLocalISODate } from "@/utils/date";

const alocacaoSchema = z
  .object({
    data: z.string().min(1, "A data é obrigatória"),
    /** Repetir a alocação diariamente até esta data (inclusive). Opcional. */
    dataFim: z.string().optional(),
    monitorId: z.string().min(1, "Selecione um monitor"),
    localId: z.string().min(1, "Selecione um local"),
    horaInicioStr: z.string().min(1, "Indique a hora de início"),
    horaFimStr: z.string().min(1, "Indique a hora de fim"),
    observacoes: z.string().optional(),
  })
  .refine((d) => horaParaMinutos(d.horaFimStr) > horaParaMinutos(d.horaInicioStr), {
    message: "A hora de fim tem de ser superior à hora de início",
    path: ["horaFimStr"],
  })
  .refine((d) => !d.dataFim || d.dataFim >= d.data, {
    message: "A data final tem de ser igual ou posterior à data inicial",
    path: ["dataFim"],
  });

type AlocacaoFormData = z.infer<typeof alocacaoSchema>;

interface AlocacaoMonitorFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Data pré-selecionada (vinda do DatePicker da página) */
  data: string;
  /** Alocação em edição (null = criação) */
  alocacao?: AlocacaoMonitor | null;
}

export default function AlocacaoMonitorForm({
  isOpen,
  onClose,
  data,
  alocacao,
}: AlocacaoMonitorFormProps) {
  const { data: monitores } = useMonitores();
  const { data: locais } = useLocais();
  const createAlocacao = useCreateAlocacao();
  const updateAlocacao = useUpdateAlocacao();
  const toast = useToast();

  const isEditing = !!alocacao;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlocacaoFormData>({
    resolver: zodResolver(alocacaoSchema),
    defaultValues: {
      data,
      monitorId: "",
      localId: "",
      horaInicioStr: "14:00",
      horaFimStr: "18:00",
      observacoes: "",
    },
  });

  // Inicializar valores quando o modal abre / muda a alocação
  React.useEffect(() => {
    if (!isOpen) return;
    if (alocacao) {
      reset({
        data: alocacao.data?.split("T")[0] ?? data,
        dataFim: "",
        monitorId: alocacao.monitorId,
        localId: alocacao.localId,
        horaInicioStr: minutosParaHora(alocacao.horaInicio),
        horaFimStr: minutosParaHora(alocacao.horaFim),
        observacoes: alocacao.observacoes ?? "",
      });
    } else {
      reset({
        data,
        dataFim: "",
        monitorId: "",
        localId: "",
        horaInicioStr: "14:00",
        horaFimStr: "18:00",
        observacoes: "",
      });
    }
  }, [isOpen, alocacao, data, reset]);

  const monitorOptions = useMemo(
    () =>
      (monitores ?? [])
        .filter((m) => m.activo)
        .map((m) => ({ value: m.id, label: m.nome })),
    [monitores]
  );

  const localOptions = useMemo(
    () =>
      (locais ?? [])
        .filter((l) => l.activo)
        .map((l) => ({
          value: l.id,
          label: l.nome,
          color: corPorId(l.id).bg,
        })),
    [locais]
  );

  const localId = watch("localId");
  const dataFim = watch("dataFim");

  // DatePicker de data - estável para não reiniciar o flatpickr a cada render.
  const handleDataChange = useCallback(
    ([date]: Date[]) => {
      if (!date) return;
      setValue("data", toLocalISODate(date), { shouldValidate: true });
    },
    [setValue]
  );

  const handleDataFimChange = useCallback(
    ([date]: Date[]) => {
      setValue("dataFim", date ? toLocalISODate(date) : "", { shouldValidate: true });
    },
    [setValue]
  );

  /** Nº de dias do lote (inclusive) - só faz sentido em criação. */
  const diasLote = useMemo(() => {
    if (isEditing || !dataFim || dataFim < watch("data")) return 1;
    const inicio = new Date(watch("data") + "T00:00:00.000Z");
    const fim = new Date(dataFim + "T00:00:00.000Z");
    return Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
  }, [isEditing, dataFim, watch]);

  const onSubmit = useCallback(
    async (formData: AlocacaoFormData) => {
      const payload = {
        data: formData.data,
        ...(formData.dataFim ? { dataFim: formData.dataFim } : {}),
        monitorId: formData.monitorId,
        localId: formData.localId,
        horaInicio: horaParaMinutos(formData.horaInicioStr),
        horaFim: horaParaMinutos(formData.horaFimStr),
        observacoes: formData.observacoes?.trim() || undefined,
      };

      if (isEditing && alocacao) {
        await updateAlocacao.mutateAsync({ id: alocacao.id, data: payload });
      } else {
        const resultado = await createAlocacao.mutateAsync(payload);
        if (isResultadoLote(resultado) && resultado.ignoradas > 0) {
          toast.warning(
            `${resultado.criadas} alocação(ões) criada(s); ${resultado.ignoradas} dia(s) ignorado(s) por conflito horário.`
          );
        }
      }
      onClose();
    },
    [isEditing, alocacao, createAlocacao, updateAlocacao, onClose, toast]
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-6">
          {isEditing ? "Editar Alocação" : "Nova Alocação de Monitor"}
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Data + Repetição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Data</label>
              <DatePicker
                id="alocacao-data-picker"
                defaultDate={watch("data")}
                onChange={handleDataChange}
              />
              {errors.data && (
                <p className="text-xs text-error-500 mt-1">{errors.data.message}</p>
              )}
            </div>
            {!isEditing && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Repetir até <span className="text-text-muted font-normal">(opcional)</span>
                </label>
                <DatePicker
                  id="alocacao-datafim-picker"
                  defaultDate={dataFim || undefined}
                  onChange={handleDataFimChange}
                />
                {errors.dataFim ? (
                  <p className="text-xs text-error-500 mt-1">{errors.dataFim.message}</p>
                ) : (
                  diasLote > 1 && (
                    <p className="text-xs text-text-muted mt-1">
                      Cria {diasLote} alocações (uma por dia); dias com conflito são ignorados.
                    </p>
                  )
                )}
              </div>
            )}
          </div>

          {/* Monitor + Local */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Monitor</label>
              <Select
                options={monitorOptions}
                value={watch("monitorId")}
                onChange={(v) => setValue("monitorId", v)}
                placeholder="Selecione um monitor"
                error={!!errors.monitorId}
              />
              {errors.monitorId && (
                <p className="text-xs text-error-500 mt-1">{errors.monitorId.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Local</label>
              <Select
                options={localOptions}
                value={localId}
                onChange={(v) => setValue("localId", v)}
                placeholder="Selecione um local"
                showColorIndicators
                error={!!errors.localId}
              />
              {errors.localId && (
                <p className="text-xs text-error-500 mt-1">{errors.localId.message}</p>
              )}
            </div>
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Hora de início</label>
              <InputField
                type="time"
                {...register("horaInicioStr")}
                error={!!errors.horaInicioStr}
                hint={errors.horaInicioStr?.message}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">Hora de fim</label>
              <InputField
                type="time"
                {...register("horaFimStr")}
                error={!!errors.horaFimStr}
                hint={errors.horaFimStr?.message}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">Observações</label>
            <TextArea
              placeholder="Notas sobre esta alocação (opcional)..."
              value={watch("observacoes") ?? ""}
              onChange={(v) => setValue("observacoes", v)}
              rows={2}
            />
          </div>

          {/* Aviso de sobreposição (validado também no backend) */}
          <p className="text-xs text-text-muted">
            O sistema impede que um monitor fique associado a dois locais no mesmo intervalo horário.
          </p>

          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "A guardar..." : isEditing ? "Guardar" : "Criar Alocação"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
