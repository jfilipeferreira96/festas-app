"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui";
import { useToast } from "@/hooks/use-toast";
import { useCreateReserva, useUpdateReserva } from "@/hooks/use-reservas";
import { useLocaisAtivos } from "@/hooks/use-locais";
import { useExtras } from "@/hooks/use-extras";
import { useConfigPreco } from "@/hooks/use-precos";
import { useSlotsHorario, useSlotsDia } from "@/hooks/use-slots-horario";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import ClienteSearchModal, { type ClienteFilho } from "@/components/common/ClienteSearchModal";
import PagamentoModal from "@/components/festas/PagamentoModal";
import { scrollToFirstFormError } from "@/components/form/form-utils";
import { addMinutosToTime, isFimDeSemana } from "@/lib/format";
import type { Cliente } from "@/lib/api/clientes";
import type { Reserva } from "@/lib/api/reservas";
import {
  buildFestaDefaults,
  buildFestaPayload,
  CORES_PREDEFINIDAS,
  festaFormSchema,
  type FestaFormData,
  type FestaFormInitialValues,
} from "./festa-form.schema";
import PessoasSection from "./sections/PessoasSection";
import AgendamentoSection from "./sections/AgendamentoSection";
import MenuBoloSection from "./sections/MenuBoloSection";
import ExtrasNotasSection from "./sections/ExtrasNotasSection";
import PagamentoSection from "./sections/PagamentoSection";

export type { FestaFormInitialValues } from "./festa-form.schema";

interface FestaFormProps {
  reserva?: Reserva | null;
  onClose: () => void;
  initialValues?: FestaFormInitialValues;
}

export default function FestaForm({ reserva, onClose, initialValues }: FestaFormProps) {
  const isEdit = !!reserva;
  const toast = useToast();
  const createReserva = useCreateReserva();
  const updateReserva = useUpdateReserva();
  const { data: locais } = useLocaisAtivos();
  const { data: extras } = useExtras();
  const { data: configPreco } = useConfigPreco();
  const { isGlobalAdmin } = useMinhasPermissoes();

  const defaultValues = useMemo(
    () => buildFestaDefaults(reserva, initialValues),
    [reserva, initialValues]
  );

  const methods = useForm<FestaFormData>({
    resolver: zodResolver(festaFormSchema),
    defaultValues,
  });
  const { control, handleSubmit, watch, setValue, getValues, formState: { isSubmitting } } = methods;
  const aniversariantesArray = useFieldArray({ control, name: "aniversariantes" });
  const adicionaisArray = useFieldArray({ control, name: "encarregadosAdicionais" });

  const watchedData = watch("data");
  const watchedMenuId = watch("menuId");
  const previsaoCriancas = watch("previsaoCriancas");
  const aniversariantes = watch("aniversariantes");

  const extraItems = useMemo(
    () => (extras ?? []).filter((e) => e.categoria === "EXTRA" && e.activo && e.subcategoria !== "Bolos"),
    [extras]
  );
  const menuExtras = useMemo(
    () => (extras ?? []).filter((e) => e.categoria === "MENU" && e.activo),
    [extras]
  );
  const salaOptions = useMemo(
    () => (locais ?? []).map((l) => ({ value: l.id, label: l.nome })),
    [locais]
  );
  const menuOptions = useMemo(
    () => [{ value: "NONE", label: "Sem menu" }, ...menuExtras.map((m) => ({ value: m.id, label: m.nome }))],
    [menuExtras]
  );

  const { data: slotsHorario } = useSlotsHorario();
  const { data: slotsDia } = useSlotsDia(watchedData);

  const coresEmUso = useMemo(() => {
    const todas = slotsDia?.coresUsadas ?? [];
    return reserva?.cor ? todas.filter((c) => c !== reserva.cor) : todas;
  }, [slotsDia?.coresUsadas, reserva?.cor]);

  const corOptions = useMemo(
    () => [
      { value: "NONE", label: "Sem cor" },
      ...CORES_PREDEFINIDAS.filter((c) => !coresEmUso.includes(c.value)).map((c) => ({
        value: c.value,
        label: c.label,
        color: c.value,
      })),
    ],
    [coresEmUso]
  );

  const [horarioCustom, setHorarioCustom] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [menuWarning, setMenuWarning] = useState("");

  useEffect(() => {
    if (!slotsHorario) return;
    const horarioVal = reserva?.horario ?? initialValues?.horario;
    if (!horarioVal) {
      setHorarioCustom(false);
      return;
    }
    setHorarioCustom(!slotsHorario.some((s) => s.horaInicio === horarioVal));
  }, [slotsHorario, reserva?.horario, initialValues?.horario]);

  const slotOptions = useMemo(() => {
    const ocupados = new Set((slotsDia?.slots ?? []).filter((s) => s.ocupado).map((s) => s.horaInicio));
    return (slotsHorario ?? []).map((s) => {
      const fim = addMinutosToTime(s.horaInicio, s.duracaoMin);
      const isOcupado = ocupados.has(s.horaInicio) && s.horaInicio !== reserva?.horario;
      return {
        value: s.horaInicio,
        label: `${s.horaInicio}–${fim}${isOcupado ? " · ocupado" : ""}`,
        disabled: isOcupado,
      };
    });
  }, [slotsHorario, slotsDia, reserva?.horario]);

  const handleSelectSlot = useCallback(
    (horaInicio: string) => {
      const slot = slotsHorario?.find((s) => s.horaInicio === horaInicio);
      setValue("horario", horaInicio, { shouldDirty: true, shouldValidate: true });
      if (!slot) return;
      setValue("duracaoMinutos", slot.duracaoMin, { shouldDirty: true, shouldValidate: true });
      if (slot.horaLancheDefault) setValue("horaLanche", slot.horaLancheDefault, { shouldDirty: true });
      if (slot.salaLancheId) setValue("salaLancheId", slot.salaLancheId, { shouldDirty: true, shouldValidate: true });
      const corLivre =
        slot.corDefault && !coresEmUso.includes(slot.corDefault)
          ? slot.corDefault
          : (CORES_PREDEFINIDAS.find((c) => !coresEmUso.includes(c.value))?.value ?? "");
      setValue("cor", corLivre, { shouldDirty: true, shouldValidate: true });
    },
    [slotsHorario, coresEmUso, setValue]
  );

  useEffect(() => {
    if (reserva) return;
    const corAtual = getValues("cor");
    if (!corAtual || coresEmUso.includes(corAtual)) {
      setValue("cor", CORES_PREDEFINIDAS.find((c) => !coresEmUso.includes(c.value))?.value ?? "");
    }
  }, [reserva, coresEmUso, setValue, getValues]);

  useEffect(() => {
    if (reserva?.valorPago && reserva.valorPago > 0) return;
    if (!watchedData || !configPreco) return;
    const precoCrianca = isFimDeSemana(watchedData)
      ? Number(configPreco.precoCriancaFimSemana)
      : Number(configPreco.precoCriancaSemana);
    const numAniversariantes = aniversariantes.filter((a) => a.nome.trim()).length || 1;
    const minimoAplicavel = (configPreco.minimosCriancasPorAniversariante ?? [])
      .filter((m) => m.aniversariantes <= numAniversariantes)
      .sort((a, b) => b.aniversariantes - a.aniversariantes)[0]?.minimo ?? 10;
    const criancasFaturadas = Math.max(previsaoCriancas ?? 10, minimoAplicavel);
    setValue("valorPago", precoCrianca * criancasFaturadas);
  }, [watchedData, configPreco, reserva?.valorPago, previsaoCriancas, aniversariantes, setValue]);

  useEffect(() => {
    if (!watchedData || menuExtras.length === 0 || reserva) return;
    const matching = menuExtras.find((m) => m.fimDeSemana === isFimDeSemana(watchedData));
    if (matching) setValue("menuId", matching.id);
  }, [watchedData, menuExtras, reserva, setValue]);

  useEffect(() => {
    if (!watchedData || !watchedMenuId) {
      setMenuWarning("");
      return;
    }
    const selected = menuExtras.find((m) => m.id === watchedMenuId);
    if (!selected) {
      setMenuWarning("");
      return;
    }
    const fds = isFimDeSemana(watchedData);
    if (selected.fimDeSemana === true && !fds) {
      setMenuWarning("Este menu é apenas para fins-de-semana/feriados.");
    } else if (selected.fimDeSemana === false && fds) {
      setMenuWarning("Este menu é apenas para dias de semana.");
    } else {
      setMenuWarning("");
    }
  }, [watchedData, watchedMenuId, menuExtras]);

  useEffect(() => {
    if (!reserva?.menu || menuExtras.length === 0) return;
    if (getValues("menuId")) return;
    const match = menuExtras.find((m) => m.nome === reserva.menu?.nome);
    if (match) setValue("menuId", match.id);
  }, [reserva, menuExtras, setValue, getValues]);

  useEffect(() => {
    if (reserva?.valorCaucao && Number(reserva.valorCaucao) > 0) return;
    if (!configPreco?.caucaoDefault) return;
    setValue("valorCaucao", Number(configPreco.caucaoDefault));
  }, [configPreco, setValue, reserva?.valorCaucao]);

  const handleClienteSelected = useCallback(
    (cliente: Cliente, filhos: ClienteFilho[]) => {
      setValue("encarregadoNome", cliente.nome, { shouldDirty: true });
      setValue("encarregadoContacto", cliente.telefone, { shouldDirty: true });
      if (cliente.email) setValue("encarregadoEmail", cliente.email, { shouldDirty: true });
      if (cliente.codigoPostal) setValue("encarregadoCodigoPostal", cliente.codigoPostal, { shouldDirty: true });
      setValue("adicionarCliente", false, { shouldDirty: true });
      if (filhos.length > 0) {
        aniversariantesArray.replace(
          filhos.map((filho) => ({
            nome: filho.nome,
            dataNascimento: filho.dataNascimento ? filho.dataNascimento.split("T")[0] : "",
          }))
        );
      }
    },
    [setValue, aniversariantesArray]
  );

  const onSubmit = useCallback(
    async (data: FestaFormData) => {
      const payload = buildFestaPayload(data, {
        isEdit,
        reservaTemMenu: !!reserva?.menu,
        menuExtrasCarregados: menuExtras.length > 0,
      });
      try {
        if (isEdit && reserva) {
          await updateReserva.mutateAsync({ id: reserva.id, data: payload });
        } else {
          await createReserva.mutateAsync(payload);
        }
        toast.success(isEdit ? "Festa atualizada com sucesso." : "Festa criada com sucesso.");
        onClose();
      } catch (err) {
        toast.handleApiError(err, "Erro ao guardar a festa.");
      }
    },
    [isEdit, reserva, menuExtras.length, updateReserva, createReserva, toast, onClose]
  );

  const onInvalid = useCallback(() => scrollToFirstFormError(), []);
  const isLoading = isSubmitting || createReserva.isPending || updateReserva.isPending;

  return (
    <div className="flex flex-col max-h-[70vh]">
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto px-3 space-y-6">
            <PessoasSection
              aniversariantes={aniversariantesArray}
              adicionais={adicionaisArray}
              dataFesta={watchedData}
              onOpenSearchCliente={() => setShowClienteSearch(true)}
            />
            <AgendamentoSection
              slotOptions={slotOptions}
              salaOptions={salaOptions}
              corOptions={corOptions}
              horarioCustom={horarioCustom}
              onToggleHorarioCustom={setHorarioCustom}
              isAdmin={isGlobalAdmin}
              onSelectSlot={handleSelectSlot}
              dataInicial={defaultValues.data}
            />
            <MenuBoloSection menuOptions={menuOptions} menuWarning={menuWarning} />
            <ExtrasNotasSection extraItems={extraItems} />
            <PagamentoSection reserva={reserva} onOpenPagamento={() => setShowPagamentoModal(true)} />
          </div>
          <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end shrink-0">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "A guardar..." : isEdit ? "Guardar Alterações" : "Criar Reserva"}
            </Button>
          </div>
        </form>
      </FormProvider>

      <ClienteSearchModal
        isOpen={showClienteSearch}
        onClose={() => setShowClienteSearch(false)}
        onSelect={handleClienteSelected}
      />

      {showPagamentoModal && reserva && (
        <PagamentoModal reserva={reserva} onClose={() => setShowPagamentoModal(false)} />
      )}
    </div>
  );
}
