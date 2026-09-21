"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui";
import { AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateReserva, useUpdateReserva, useCheckDisponibilidade, useReserva } from "@/hooks/use-reservas";
import { useLocaisAtivos } from "@/hooks/use-locais";
import { useSalasLanche } from "@/hooks/use-salas-lanche";
import { useExtras } from "@/hooks/use-extras";
import { useConfigPreco } from "@/hooks/use-precos";
import { useSlotsHorario, useSlotsDia } from "@/hooks/use-slots-horario";
import { ehSubcategoriaBolos } from "@/lib/constants/bolo";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import ClienteSearchModal, { type ClienteFilho } from "@/components/common/ClienteSearchModal";
import PagamentoModal from "@/components/festas/PagamentoModal";
import { mensagensDeErro, scrollToFirstFormError } from "@/components/form/form-utils";
import { addMinutosToTime, isFimDeSemana } from "@/lib/format";
import { coresEmConflito, corDisponivel, type FestaComIntervalo } from "@/lib/cores";
import { textoPlanoDia } from "@/lib/api/slotsHorario";
import type { Cliente } from "@/lib/api/clientes";
import type { Reserva } from "@/lib/api/reservas";
import {
  buildFestaDefaults,
  buildFestaPayload,
  calcularEstimativaFesta,
  CORES_PREDEFINIDAS,
  DATA_NASCIMENTO_DEFAULT,
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

/** Extras identificados como Almoço/Jantar pelo nome ficam na secção do Menu. */
const EXTRAS_SUPLEMENTO_MENU_RE = /almo[çc]o|jant[ae]/i;

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
  const { data: salasLanche } = useSalasLanche();
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
  const { control, handleSubmit, watch, setValue, getValues, formState: { isSubmitting, dirtyFields } } = methods;
  const aniversariantesArray = useFieldArray({ control, name: "aniversariantes" });
  const adicionaisArray = useFieldArray({ control, name: "encarregadosAdicionais" });

  const watchedData = watch("data");
  const watchedHorario = watch("horario");
  const watchedDuracao = watch("duracaoMinutos");
  const watchedLocalId = watch("localId");
  const watchedMenuId = watch("menuId");
  const previsaoCriancas = watch("previsaoCriancas");
  const watchedNumAdultos = watch("numAdultos");
  const aniversariantes = watch("aniversariantes");

  // Suplementos de menu (Almoço/Jantar, identificados pelo nome) ficam por
  // baixo do select de Menu - não na secção de Extras (pedido do cliente).
  const suplementosMenu = useMemo(
    () => (extras ?? []).filter((e) => e.activo && EXTRAS_SUPLEMENTO_MENU_RE.test(e.nome)),
    [extras]
  );
  // Bolos ficam FORA dos extras: a subcategoria varia de capitalização na BD
  // ("Bolos" no seed vs "BOLOS" em produção) - ver Parte B do plano.
  const extraItems = useMemo(
    () =>
      (extras ?? []).filter(
        (e) =>
          e.categoria === "EXTRA" &&
          e.activo &&
          !ehSubcategoriaBolos(e.subcategoria) &&
          !EXTRAS_SUPLEMENTO_MENU_RE.test(e.nome)
      ),
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
  // Salas de lanche activas; se a sala guardada na reserva estiver inactiva,
  // é acrescentada às opções para continuar a ser exibida em edição.
  const salasLancheOptions = useMemo(() => {
    const options = (salasLanche ?? [])
      .filter((s) => s.activo)
      .map((s) => ({ value: s.id, label: s.nome }));
    const atual = defaultValues.salaLancheId;
    if (atual && !options.some((o) => o.value === atual)) {
      options.push({ value: atual, label: reserva?.salaLanche?.nome ?? atual });
    }
    return options;
  }, [salasLanche, defaultValues.salaLancheId, reserva?.salaLanche?.nome]);
  // Total de crianças (confirmadas ?? previstas ?? 1) - base de cobrança dos extras.
  const numCriancasConfirmadasWatched = watch("numCriancasConfirmadas");
  const numPessoasExtras = useMemo(() => {
    const base = Number.isFinite(numCriancasConfirmadasWatched)
      ? (numCriancasConfirmadasWatched as number)
      : Number.isFinite(previsaoCriancas)
        ? (previsaoCriancas as number)
        : 1;
    return Math.max(base, 1);
  }, [numCriancasConfirmadasWatched, previsaoCriancas]);

  const { data: slotsHorario } = useSlotsHorario(watchedData || undefined);
  const { data: slotsDia } = useSlotsDia(watchedData);

  // Aviso não-bloqueante: sobreposição temporal com outra festa no mesmo
  // local é permitida (grelha desfasada), mas o utilizador deve ser alertado.
  const { data: disponibilidade } = useCheckDisponibilidade({
    data: watchedData || undefined,
    horario: watchedHorario || undefined,
    duracaoMinutos: watchedDuracao || undefined,
    localId: watchedLocalId || undefined,
    excludeId: reserva?.id,
  });

  // Todas as festas activas do dia (em slots + custom), sem a festa em edição.
  const festasDoDia = useMemo<FestaComIntervalo[]>(() => {
    const dosSlots = (slotsDia?.slots ?? [])
      .map((s) => s.festa)
      .filter((f): f is NonNullable<typeof f> => !!f)
      .map((f) => ({ id: f.id, cor: f.cor, horario: f.horario, duracaoMinutos: f.duracaoMinutos }));
    const semSlot = (slotsDia?.festasSemSlot ?? []).map((f) => ({
      id: f.id,
      cor: f.cor,
      horario: f.horario,
      duracaoMinutos: f.duracaoMinutos,
    }));
    return [...dosSlots, ...semSlot]
      .filter((f) => f.cor && f.id !== reserva?.id)
      .map(({ cor, horario, duracaoMinutos }) => ({ cor, horario, duracaoMinutos }));
  }, [slotsDia, reserva?.id]);

  // Regra do plano diário: só há conflito de cor se as festas se sobrepõem
  // no tempo (sem coexistência de pulseiras no parque).
  const coresEmUso = useMemo(() => {
    if (!watchedHorario) return [];
    return coresEmConflito(festasDoDia, watchedHorario, watchedDuracao || 135);
  }, [festasDoDia, watchedHorario, watchedDuracao]);

  const [horarioCustom, setHorarioCustom] = useState(false);
  const [showClienteSearch, setShowClienteSearch] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [menuWarning, setMenuWarning] = useState("");

  // A modal de pagamento usa dados frescos da BD: a prop `reserva` pode estar
  // stale (total/pagamentos ajustados na própria modal) e mostraria
  // falta/liquidado errados - mesmo padrão do form de Entradas Livres.
  const { data: reservaFresca } = useReserva(showPagamentoModal && reserva ? reserva.id : "");
  const reservaParaPagamento = reservaFresca ?? reserva;

  useEffect(() => {
    if (!slotsHorario) return;
    const horarioVal = reserva?.horario ?? initialValues?.horario;
    if (!horarioVal) {
      setHorarioCustom(false);
      return;
    }
    // Horário personalizado (fora dos slots): só o admin pode marcar/editar.
    // Para os restantes papéis a hora fora dos slots é mostrada read-only na
    // secção de agendamento (nunca editável por não-admins).
    setHorarioCustom(!slotsHorario.some((s) => s.horaInicio === horarioVal) && isGlobalAdmin);
  }, [slotsHorario, reserva?.horario, initialValues?.horario, isGlobalAdmin]);

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
      const conflito = coresEmConflito(festasDoDia, horaInicio, slot.duracaoMin);
      setValue("cor", corDisponivel(conflito, slot.corDefault), { shouldDirty: true, shouldValidate: true });
    },
    [slotsHorario, festasDoDia, setValue]
  );

  useEffect(() => {
    if (reserva) return;
    const corAtual = getValues("cor");
    if (!corAtual || coresEmUso.includes(corAtual)) {
      setValue("cor", CORES_PREDEFINIDAS.find((c) => !coresEmUso.includes(c.value))?.value ?? "");
    }
  }, [reserva, coresEmUso, setValue, getValues]);

  const estimativaFesta = useMemo(
    () =>
      calcularEstimativaFesta(
        configPreco,
        watchedData,
        previsaoCriancas,
        aniversariantes.filter((a) => a.nome.trim()).length,
        watchedNumAdultos
      ),
    [configPreco, watchedData, previsaoCriancas, aniversariantes, watchedNumAdultos]
  );

  useEffect(() => {
    if (reserva && reserva.valorTotal != null) return;
    if (dirtyFields.totalAPagar) return; // total escrito à mão - respeitar
    if (!watchedData || !configPreco) return;
    if (estimativaFesta.estimativa > 0) {
      setValue("totalAPagar", estimativaFesta.estimativa);
    }
  }, [watchedData, configPreco, reserva, estimativaFesta, setValue, dirtyFields.totalAPagar]);

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
      // Cliente com optOut (ex.: marketing) não recebe email por defeito -
      // o utilizador pode sempre ligar o checkbox para esta festa.
      setValue("enviarEmail", cliente.optOut !== true, { shouldDirty: true });
      if (filhos.length > 0) {
        aniversariantesArray.replace(
          filhos.map((filho) => ({
            nome: filho.nome,
            dataNascimento: filho.dataNascimento?.split("T")[0] || DATA_NASCIMENTO_DEFAULT,
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

  // Falha de validação JAMAIS silenciosa: scroll + toast com as mensagens
  const onInvalid = useCallback(
    (errors: Record<string, unknown>) => {
      scrollToFirstFormError();
      const mensagens = mensagensDeErro(errors);
      toast.error(
        mensagens.length > 0
          ? `Não foi possível guardar: ${mensagens.slice(0, 3).join(" · ")}${mensagens.length > 3 ? "…" : ""}`
          : "Não foi possível guardar. Verifique os campos destacados."
      );
    },
    [toast]
  );
  const isLoading = isSubmitting || createReserva.isPending || updateReserva.isPending;

  return (
    <div className="flex flex-col max-h-[70vh]">
      <FormProvider {...methods}>
        <form autoComplete="off" onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0">
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
              salasLancheOptions={salasLancheOptions}
              horarioCustom={horarioCustom}
              onToggleHorarioCustom={setHorarioCustom}
              isAdmin={isGlobalAdmin}
              onSelectSlot={handleSelectSlot}
              dataInicial={defaultValues.data}
              planoTexto={textoPlanoDia(slotsDia?.plano)}
            />
            {(disponibilidade?.conflitos?.length ?? 0) > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-accent-orange-50 border border-accent-orange-200 px-3 py-2 text-xs text-accent-orange-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-accent-orange-600" />
                <span>
                  Nota: este horário sobrepõe-se a{" "}
                  {disponibilidade!.conflitos.length === 1
                    ? "outra festa"
                    : `${disponibilidade!.conflitos.length} festas`}{" "}
                  no mesmo período (
                  {disponibilidade!.conflitos
                    .map((c) => `${c.aniversarianteNome || "festa"} às ${c.horario}`)
                    .join(", ")}
                  ). É permitido - confirme apenas se intencional.
                </span>
              </div>
            )}
            <MenuBoloSection
              menuOptions={menuOptions}
              menuWarning={menuWarning}
              suplementosMenu={suplementosMenu}
              numPessoas={numPessoasExtras}
            />
            <ExtrasNotasSection extraItems={extraItems} numPessoas={numPessoasExtras} />
            <PagamentoSection
              reserva={reserva}
              onOpenPagamento={() => setShowPagamentoModal(true)}
              estimativa={estimativaFesta}
            />
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

      {showPagamentoModal && reservaParaPagamento && (
        <PagamentoModal reserva={reservaParaPagamento} onClose={() => setShowPagamentoModal(false)} />
      )}
    </div>
  );
}
