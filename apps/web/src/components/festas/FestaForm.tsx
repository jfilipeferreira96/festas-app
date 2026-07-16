"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, AlertTriangle, User, Cake, MapPin,
  FileText, Search, CheckCircle, Sandwich, Gift,
} from "lucide-react";
import { Button } from "@/components/ui";
import InputField from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import { Select } from "@/components/ui/select";
import MultiSelect from "@/components/form/MultiSelect";
import Checkbox from "@/components/form/input/Checkbox";
import { useCreateReserva, useUpdateReserva, useCheckDisponibilidade } from "@/hooks/use-reservas";
import { useLocaisAtivos } from "@/hooks/use-locais";
import { useExtras } from "@/hooks/use-extras";
import { useMonitores } from "@/hooks/use-monitores";
import { useEtapasFesta } from "@/hooks/use-etapasFesta";
import { useConfigPreco } from "@/hooks/use-precos";
import { useSlotsHorario, useSlotsDia } from "@/hooks/use-slots-horario";
import { useSalasLanche } from "@/hooks/use-salas-lanche";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
import { FESTA_COLORS } from "@/components/ui/FestaColorPicker";
import ClienteSearchModal, { type ClienteFilho } from "@/components/common/ClienteSearchModal";
import type { Cliente } from "@/lib/api/clientes";
import type { Reserva, MetodoPagamento, DisponibilidadeResult, TipoBolo } from "@/lib/api/reservas";

// ── Types ──────────────────────────────────────────────────────
interface AniversarianteInput { nome: string; dataNascimento: string; }
interface EncarregadoInput { nome: string; contacto: string; email: string; codigoPostal: string; }

interface ExtraItem {
  id: string; nome: string; precoUnitario: number;
  subcategoria?: string; requerTexto?: boolean; icone?: string;
  fimDeSemana?: boolean | null;
}

// ── Cores pré-definidas ────────────────────────────────────────

// Cores predefinidas derivadas da paleta partilhada (FestaColorPicker)
const CORES_PREDEFINIDAS = FESTA_COLORS.map((c) => ({ value: c.value, label: c.name }));

// ── Zod Schema ─────────────────────────────────────────────────
const reservaSchema = z.object({
  tema: z.string().optional(),
  data: z.string().min(1, "Data é obrigatória"),
  horario: z.string().min(1, "Horário é obrigatório"),
  horaLanche: z.string().optional(),
  duracaoMinutos: z.number().min(30, "Duração mínima é 30 minutos"),
  localId: z.string().min(1, "Seleccione uma sala"),
  salaLancheId: z.string().optional(),
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoContacto: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  encarregadoCodigoPostal: z.string().optional(),
  adicionarCliente: z.boolean().optional(),
  monitoresIds: z.array(z.string()).optional(),
  etapasIds: z.array(z.string()).optional(),
  cor: z.string().optional(),
  menuId: z.string().optional(),
  // Bolo (enum + tema)
  bolo: z.string().optional(),
  boloTema: z.string().optional(),
  previsaoCriancas: z.number().min(1, "Mínimo 1 criança").max(100),
  numCriancasConfirmadas: z.number().min(0).optional(),
  // Notas por equipa
  notasCacifos: z.string().optional(),
  notasLanche: z.string().optional(),
  metodoPagamento: z.string().optional(),
  valorPago: z.number().min(0).optional(),
  pago: z.boolean().optional(),
  // Pagamento dividido (2º método)
  metodoPagamento2: z.string().optional(),
  valorPago2: z.number().min(0).optional(),
  // Meias (compra obrigatória no parque)
  meiasQuantidade: z.number().min(0).optional(),
  observacoesGerais: z.string().optional(),
  observacoesLesoes: z.string().optional(),
  observacoesBrindes: z.string().optional(),
  outrosExtras: z.string().optional(),
  caucao: z.string().optional(),
  referenciaPagamento: z.string().optional(),
  boloQuantidade: z.number().min(0).optional(),
  valorCaucao: z.number().min(0).optional(),
  descontoPercentagem: z.number().min(0).max(100).optional(),
  descontoMotivo: z.string().optional(),
});

type ReservaFormData = z.infer<typeof reservaSchema>;

/** Valores iniciais opcionais (ex: ao clicar num slot vazio). */
export interface FestaFormInitialValues {
  data?: string;
  horario?: string;
  duracaoMinutos?: number;
  horaLanche?: string;
  cor?: string;
  salaLancheId?: string;
}

interface ReservaFormProps {
  reserva?: Reserva | null;
  onClose: () => void;
  initialValues?: FestaFormInitialValues;
}

const DURACAO_OPTIONS = [
  { value: "60", label: "1h" }, { value: "90", label: "1h30" },
  { value: "120", label: "2h" }, { value: "150", label: "2h30" },
  { value: "180", label: "3h" },
];

function formatEuro(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

/** Formats a Date (or ISO string from API) as YYYY-MM-DD using local components */
function toISODate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Adiciona minutos a uma string "HH:MM" e retorna "HH:MM" */
function addMinutosToTime(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutos;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

function calcIdade(dataNascimento: string, dataFesta: string): number {
  if (!dataNascimento || !dataFesta) return 0;
  const nasc = new Date(dataNascimento); const festa = new Date(dataFesta);
  let idade = festa.getFullYear() - nasc.getFullYear();
  const m = festa.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && festa.getDate() < nasc.getDate())) idade--;
  return Math.max(0, idade);
}

/** Agrupa extras por subcategoria */
function groupBySubcategoria(items: ExtraItem[]) {
  const grouped: Record<string, ExtraItem[]> = {};
  const ungrouped: ExtraItem[] = [];
  for (const item of items) {
    const sub = item.subcategoria?.trim();
    if (sub) { if (!grouped[sub]) grouped[sub] = []; grouped[sub].push(item); }
    else ungrouped.push(item);
  }
  return { grouped, ungrouped };
}

// ── Main Component ─────────────────────────────────────────────
export default function FestaForm({ reserva, onClose, initialValues }: ReservaFormProps) {
  const createReserva = useCreateReserva();
  const updateReserva = useUpdateReserva();
  const { data: locais } = useLocaisAtivos();
  const { data: extras } = useExtras();
  const { data: monitores } = useMonitores();
  const { data: etapas } = useEtapasFesta();
  const { isGlobalAdmin } = useMinhasPermissoes();

  const extraItems = useMemo<ExtraItem[]>(
    () => (extras ?? []).filter((e) => e.categoria === "EXTRA" && e.activo) as ExtraItem[],
    [extras]
  );

  const extraGroups = useMemo(() => groupBySubcategoria(extraItems), [extraItems]);

  const salaOptions = useMemo(
    () => (locais ?? []).map((l) => ({ value: l.id, label: l.nome })),
    [locais]
  );
  const { data: salasLanche } = useSalasLanche();
  const salaLancheOptions = useMemo(
    () => [
      { value: "", label: "Sem sala de lanche" },
      ...(salasLanche ?? []).map((s) => ({ value: s.id, label: s.nome })),
    ],
    [salasLanche]
  );
  const monitorOptions = useMemo(
    () => (monitores ?? []).filter((m) => m.activo).map((m) => ({ value: m.id, text: m.nome, selected: false })),
    [monitores]
  );
  const etapaOptions = useMemo(
    () => (etapas ?? []).filter((e) => e.activo).map((e) => ({ value: e.id, text: e.nome, selected: false })),
    [etapas]
  );
  const menuOptions = useMemo(
    () => [
      { value: "NONE", label: "Sem menu" },
      ...(extras ?? []).filter((e) => e.categoria === "MENU" && e.activo).map((e) => ({ value: e.id, label: e.nome })),
    ], [extras]
  );

  const [aniversariantes, setAniversariantes] = useState<AniversarianteInput[]>(() => {
    if (reserva?.aniversariantes?.length)
      return reserva.aniversariantes.map((a) => ({ nome: a.aniversariante.nome, dataNascimento: a.aniversariante.dataNascimento ?? "" }));
    return [{ nome: "", dataNascimento: "" }];
  });
  const [selectedExtrasIds, setSelectedExtrasIds] = useState<string[]>(() => reserva?.extras?.map((e) => e.extra.id) ?? []);
  const [extrasTexto, setExtrasTexto] = useState<Record<string, string>>({});
  const [encarregadosAdicionais, setEncarregadosAdicionais] = useState<EncarregadoInput[]>([]);
  const [showAniversarianteError, setShowAniversarianteError] = useState(false);
  // Controla a modal de pesquisa de cliente existente
  const [showClienteSearch, setShowClienteSearch] = useState(false);

  const defaultValues = useMemo<ReservaFormData>(() => ({
    tema: reserva?.tema ?? "",
    data: reserva?.data ? toISODate(reserva.data) : (initialValues?.data ?? ""),
    horario: reserva?.horario ?? initialValues?.horario ?? "",
    duracaoMinutos: reserva?.duracaoMinutos ?? initialValues?.duracaoMinutos ?? 120, localId: reserva?.localId ?? "",
    horaLanche: reserva?.horaLanche ?? initialValues?.horaLanche ?? "",
    salaLancheId: reserva?.salaLancheId ?? initialValues?.salaLancheId ?? "",
    encarregadoNome: reserva?.cliente?.nome ?? "",
    encarregadoContacto: reserva?.cliente?.telefone ?? "",
    encarregadoEmail: reserva?.cliente?.email ?? "",
    encarregadoCodigoPostal: reserva?.cliente?.codigoPostal ?? "",
    adicionarCliente: true,
    monitoresIds: reserva?.monitores?.map((m) => m.monitor.id) ?? [],
    etapasIds: reserva?.etapas?.map((e) => e.etapa.id) ?? [],
    cor: reserva?.cor ?? initialValues?.cor ?? "", menuId: "",
    // Bolo
    bolo: reserva?.bolo ?? "",
    boloTema: reserva?.boloTema ?? "",
    // Crianças
    previsaoCriancas: reserva?.numCriancas ?? reserva?.previsaoCriancas ?? 10,
    numCriancasConfirmadas: reserva?.numCriancasConfirmadas ?? undefined,
    // Notas por equipa
    notasCacifos: reserva?.notasCacifos ?? "",
    notasLanche: reserva?.notasLanche ?? "",
    // Pagamento
    metodoPagamento: reserva?.metodoPagamento ?? "", valorPago: reserva?.valorPago ?? 0,
    pago: reserva?.pago ?? false,
    metodoPagamento2: reserva?.metodoPagamento2 ?? "", valorPago2: reserva?.valorPago2 ?? 0,
    meiasQuantidade: reserva?.meiasQuantidade ?? 0,
    observacoesGerais: reserva?.observacoesGerais ?? "", observacoesLesoes: reserva?.observacoesLesoes ?? "",
    observacoesBrindes: reserva?.observacoesBrindes ?? "", outrosExtras: reserva?.outrosExtras ?? "",
    caucao: reserva?.caucao ?? "", referenciaPagamento: reserva?.referenciaPagamento ?? "",
    boloQuantidade: reserva?.boloQuantidade ?? undefined,
    valorCaucao: reserva?.valorCaucao ? Number(reserva.valorCaucao) : undefined,
    descontoPercentagem: reserva?.descontoPercentagem ?? undefined,
    descontoMotivo: reserva?.descontoMotivo ?? "",
  }), [reserva, initialValues]);

  const { register, handleSubmit, setValue, watch, getValues, trigger, formState: { errors, isSubmitting } } = useForm<ReservaFormData>({
    resolver: zodResolver(reservaSchema), defaultValues,
  });

  const watchedData = watch("data");
  const watchedHorario = watch("horario");
  const watchedDuracao = watch("duracaoMinutos");
  const watchedLocalId = watch("localId");
  const pago = watch("pago") ?? false;
  const currentMonitoresIds = watch("monitoresIds") ?? [];
  const currentEtapasIds = watch("etapasIds") ?? [];
  const previsaoCriancas = watch("previsaoCriancas");

  // ── Verificação de disponibilidade (aviso apenas, não bloqueia) ──
  const disponibilidade = useCheckDisponibilidade({
    data: watchedData,
    horario: watchedHorario,
    duracaoMinutos: watchedDuracao,
    localId: watchedLocalId,
    excludeId: reserva?.id,
  });

  // ── Slots de horário e cores em uso no mesmo dia ──
  const { data: slotsHorario } = useSlotsHorario();
  const { data: slotsDia } = useSlotsDia(watchedData);

  // Cores já ocupadas por outras festas activas neste dia.
  // coresUsadas vem do endpoint /api/slots-horario/dia (testado no service).
  // Em modo edição, excluímos a cor da própria reserva para que permaneça seleccionável.
  const coresEmUso = useMemo(() => {
    const todas = slotsDia?.coresUsadas ?? [];
    return reserva?.cor ? todas.filter((c) => c !== reserva.cor) : todas;
  }, [slotsDia?.coresUsadas, reserva?.cor]);
  const [horarioCustom, setHorarioCustom] = useState(false);

  // Determina se o horário actual corresponde a um slot; caso contrário,
  // activa automaticamente o modo "horário personalizado".
  React.useEffect(() => {
    if (!slotsHorario) return;
    const horarioVal = reserva?.horario ?? initialValues?.horario;
    if (!horarioVal) {
      setHorarioCustom(false);
      return;
    }
    setHorarioCustom(!slotsHorario.some((s) => s.horaInicio === horarioVal));
  }, [slotsHorario, reserva?.horario, initialValues?.horario]);

  const slotOptions = useMemo(() => {
    const ocupados = new Set(
      (slotsDia?.slots ?? []).filter((s) => s.ocupado).map((s) => s.horaInicio),
    );
    return (slotsHorario ?? []).map((s) => {
      const fim = addMinutosToTime(s.horaInicio, s.duracaoMin);
      // A própria reserva em edição ocupa o seu slot — não o desactiva.
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
      setValue("horario", horaInicio, { shouldDirty: true });
      if (slot) {
        setValue("duracaoMinutos", slot.duracaoMin, { shouldDirty: true });
        // Auto-preencher defaults do slot (cor, hora lanche, sala lanche) — todos editáveis.
        if (slot.horaLancheDefault) setValue("horaLanche", slot.horaLancheDefault, { shouldDirty: true });
        if (slot.salaLancheId) setValue("salaLancheId", slot.salaLancheId, { shouldDirty: true });
        // Cor: usar o default do slot apenas se ainda estiver livre nesse dia;
        // caso contrário seleccionar automaticamente a primeira cor disponível
        // (evita cores repetidas no mesmo dia).
        const corSlot = slot.corDefault;
        if (corSlot && !coresEmUso.includes(corSlot)) {
          setValue("cor", corSlot, { shouldDirty: true });
        } else {
          const primeiraLivre = CORES_PREDEFINIDAS.find((c) => !coresEmUso.includes(c.value));
          setValue("cor", primeiraLivre?.value ?? "", { shouldDirty: true });
        }
      }
    },
    [slotsHorario, setValue, coresEmUso],
  );

  // ── Auto-preencher / auto-trocar cor conforme disponibilidade do dia ──
  React.useEffect(() => {
    // Em modo edição, a cor da reserva já está excluída de coresEmUso — nada a fazer.
    if (reserva) return;
    const corAtual = getValues("cor");
    // Se não há cor definida OU a cor actual passou a estar ocupada (mudança de data),
    // seleccionar automaticamente a primeira cor livre.
    if (!corAtual || coresEmUso.includes(corAtual)) {
      const primeiraLivre = CORES_PREDEFINIDAS.find((c) => !coresEmUso.includes(c.value));
      setValue("cor", primeiraLivre?.value ?? "");
    }
  }, [reserva, coresEmUso, setValue, getValues]);

  // ── Tarifário global (auto-preenchimento do valor) ──
  const { data: configPreco } = useConfigPreco();
  const valorPagoEditedRef = useRef(false);

  React.useEffect(() => {
    // Não auto-preencher se o utilizador já editou manualmente
    if (valorPagoEditedRef.current) return;
    // Não auto-preencher em modo edição se já existe valor definido
    if (reserva?.valorPago && reserva.valorPago > 0) return;
    if (!watchedData || !configPreco) return;

    const dataObj = new Date(watchedData + "T00:00:00");
    const dia = dataObj.getDay();
    const isFimSemana = dia === 0 || dia === 6;
    // Preço por criança (preenchimento automático: preço × nº crianças faturadas)
    const precoCrianca = isFimSemana
      ? Number(configPreco.precoCriancaFimSemana)
      : Number(configPreco.precoCriancaSemana);
    const numAniversariantes = aniversariantes.filter((a) => a.nome.trim()).length || 1;
    const minimos = configPreco.minimosCriancasPorAniversariante ?? [];
    const minimoAplicavel = minimos
      .filter((m) => m.aniversariantes <= numAniversariantes)
      .sort((a, b) => b.aniversariantes - a.aniversariantes)[0]?.minimo ?? 10;
    const criancasFaturadas = Math.max(previsaoCriancas ?? 10, minimoAplicavel);
    setValue("valorPago", precoCrianca * criancasFaturadas);
  }, [watchedData, configPreco, setValue, reserva?.valorPago, previsaoCriancas, aniversariantes]);

  // ── Auto-selecionar menu conforme dia da semana vs fim-de-semana ──
  const menuExtras = useMemo(
    () => (extras ?? []).filter((e) => e.categoria === "MENU" && e.activo),
    [extras]
  );
  const [menuWarning, setMenuWarning] = useState("");
  const watchedMenuId = watch("menuId");

  React.useEffect(() => {
    if (!watchedData || menuExtras.length === 0) return;
    if (reserva) return; // Não sobrescrever em modo edição inicialmente

    const dataObj = new Date(watchedData + "T00:00:00");
    const dia = dataObj.getDay();
    const isFimSemana = dia === 0 || dia === 6;

    // Procurar menu correspondente (fimDeSemana=true para fds, false para semana)
    const matchingMenu = menuExtras.find((m) => m.fimDeSemana === isFimSemana);
    if (matchingMenu) {
      setValue("menuId", matchingMenu.id);
      setMenuWarning("");
    }
  }, [watchedData, menuExtras, setValue, reserva]);

  // ── Aviso quando o utilizador seleciona um menu que não corresponde ao dia ──
  React.useEffect(() => {
    if (!watchedData || !watchedMenuId) { setMenuWarning(""); return; }

    const dataObj = new Date(watchedData + "T00:00:00");
    const dia = dataObj.getDay();
    const isFimSemana = dia === 0 || dia === 6;

    const selectedMenu = menuExtras.find((m) => m.id === watchedMenuId);
    if (!selectedMenu) { setMenuWarning(""); return; }

    if (selectedMenu.fimDeSemana === true && !isFimSemana) {
      setMenuWarning("Este menu é apenas para fins-de-semana/feriados.");
    } else if (selectedMenu.fimDeSemana === false && isFimSemana) {
      setMenuWarning("Este menu é apenas para dias de semana.");
    } else {
      setMenuWarning("");
    }
  }, [watchedData, watchedMenuId, menuExtras]);

  // ── Pré-preencher valorCaucao com o default das configurações ──
  React.useEffect(() => {
    if (reserva?.valorCaucao && Number(reserva.valorCaucao) > 0) return;
    if (!configPreco?.caucaoDefault) return;
    setValue("valorCaucao", Number(configPreco.caucaoDefault));
  }, [configPreco, setValue, reserva?.valorCaucao]);

  const totalEstimado = useMemo(() => {
    let total = 0;
    for (const extraId of selectedExtrasIds) { const extra = extraItems.find((e) => e.id === extraId); if (extra) total += Number(extra.precoUnitario); }
    return total;
  }, [selectedExtrasIds, extraItems]);

  const handleExtrasChange = useCallback((selected: string[]) => setSelectedExtrasIds(selected), []);
  const handleMonitoresChange = useCallback((selected: string[]) => setValue("monitoresIds", selected), [setValue]);
  const handleEtapasChange = useCallback((selected: string[]) => setValue("etapasIds", selected), [setValue]);

  // ── Pesquisa de cliente existente: preenche encarregado + aniversariantes ──
  const handleClienteSelected = useCallback(
    (cliente: Cliente, filhosSelecionados: ClienteFilho[]) => {
      setValue("encarregadoNome", cliente.nome, { shouldDirty: true });
      setValue("encarregadoContacto", cliente.telefone, { shouldDirty: true });
      if (cliente.email) {
        setValue("encarregadoEmail", cliente.email, { shouldDirty: true });
      }
      if (cliente.codigoPostal) {
        setValue("encarregadoCodigoPostal", cliente.codigoPostal, { shouldDirty: true });
      }
      // Como o cliente já existe, desmarca a opção de adicionar aos clientes
      setValue("adicionarCliente", false, { shouldDirty: true });

      // Pré-preenche aniversariantes com os filhos seleccionados (se houver)
      if (filhosSelecionados.length > 0) {
        setAniversariantes(
          filhosSelecionados.map((filho) => ({
            nome: filho.nome,
            dataNascimento: filho.dataNascimento ? filho.dataNascimento.split("T")[0] : "",
          }))
        );
        setShowAniversarianteError(false);
      }
    },
    [setValue]
  );
  const addAniversariante = useCallback(() => setAniversariantes((p) => [...p, { nome: "", dataNascimento: "" }]), []);
  const removeAniversariante = useCallback((i: number) => setAniversariantes((p) => p.filter((_, idx) => idx !== i)), []);
  const updateAniversariante = useCallback((i: number, field: keyof AniversarianteInput, value: string) => {
    setAniversariantes((p) => { const n = [...p]; n[i] = { ...n[i], [field]: value }; return n; });
    if (field === "nome" && value.trim()) setShowAniversarianteError(false);
  }, []);
  const addEncarregadoAdicional = useCallback(() => setEncarregadosAdicionais((p) => [...p, { nome: "", contacto: "", email: "", codigoPostal: "" }]), []);
  const removeEncarregadoAdicional = useCallback((i: number) => setEncarregadosAdicionais((p) => p.filter((_, idx) => idx !== i)), []);
  const updateEncarregadoAdicional = useCallback((i: number, field: keyof EncarregadoInput, value: string) => {
    setEncarregadosAdicionais((p) => { const n = [...p]; n[i] = { ...n[i], [field]: value }; return n; });
  }, []);
  const [showDataNascimentoError, setShowDataNascimentoError] = useState(false);
const onSubmit = useCallback(async (data: ReservaFormData) => {
    const primeiroAniv = aniversariantes[0];
    const idade = calcIdade(primeiroAniv?.dataNascimento ?? "", data.data || new Date().toISOString().split("T")[0]);
    const adicionaisText = encarregadosAdicionais.filter((e) => e.nome.trim()).map((e, i) => {
      const parts = [`Encarregado ${i + 2}: ${e.nome}`]; if (e.contacto) parts.push(e.contacto); if (e.email) parts.push(e.email); if (e.codigoPostal) parts.push(e.codigoPostal); return parts.join(" · ");
    }).join("\n");
    const obsGerais = [data.observacoesGerais, adicionaisText].filter(Boolean).join("\n\n");

    const payload = {
      aniversarianteNome: primeiroAniv?.nome ?? "",
      clienteNome: data.encarregadoNome, clienteContacto: data.encarregadoContacto,
      clienteEmail: data.encarregadoEmail, clienteCodigoPostal: data.encarregadoCodigoPostal || undefined,
      adicionarCliente: data.adicionarCliente ?? true, idadeAnos: idade,
      tema: data.tema || undefined, data: data.data, horario: data.horario,
      duracaoMinutos: data.duracaoMinutos, localId: data.localId, numCriancas: data.previsaoCriancas,
      horaLanche: data.horaLanche || undefined,
      extrasIds: selectedExtrasIds.length > 0 ? selectedExtrasIds : undefined,
      extrasTexto: Object.fromEntries(Object.entries(extrasTexto).filter(([, v]) => v.trim())),
      monitoresIds: data.monitoresIds, etapasIds: data.etapasIds,
      cor: data.cor || undefined, menuId: data.menuId || undefined,
      // Bolo (TipoBolo)
      bolo: (data.bolo || undefined) as TipoBolo | undefined,
      boloTema: data.boloTema || undefined,
      // Crianças
      numCriancasConfirmadas: data.numCriancasConfirmadas || undefined,
      // Notas por equipa
      notasCacifos: data.notasCacifos || undefined,
      notasLanche: data.notasLanche || undefined,
      // Pagamento
      metodoPagamento: (data.metodoPagamento || undefined) as MetodoPagamento | undefined,
      valorPago: data.valorPago || undefined, pago: data.pago, notas: obsGerais,
      metodoPagamento2: (data.metodoPagamento2 || undefined) as MetodoPagamento | undefined,
      valorPago2: data.valorPago2 || undefined,
      meiasQuantidade: data.meiasQuantidade || undefined,
      observacoesGerais: data.observacoesGerais || undefined,
      observacoesLesoes: data.observacoesLesoes || undefined,
      observacoesBrindes: data.observacoesBrindes || undefined,
      outrosExtras: data.outrosExtras || undefined,
      caucao: data.caucao || undefined, referenciaPagamento: data.referenciaPagamento || undefined,
      boloQuantidade: data.boloQuantidade || undefined,
      valorCaucao: data.valorCaucao || undefined,
      descontoPercentagem: data.descontoPercentagem || undefined,
      descontoMotivo: data.descontoMotivo || undefined,
      aniversariantes: aniversariantes.filter((a) => a.nome.trim()).map((a) => ({ nome: a.nome, dataNascimento: a.dataNascimento || undefined })),
    };
    if (reserva) await updateReserva.mutateAsync({ id: reserva.id, data: payload });
    else await createReserva.mutateAsync(payload);
    onClose();
  }, [reserva, aniversariantes, encarregadosAdicionais, selectedExtrasIds, extrasTexto, updateReserva, createReserva, onClose]);

  const corOptions = useMemo(() => [
    { value: "NONE", label: "Sem cor" },
    ...CORES_PREDEFINIDAS
      .filter((c) => !coresEmUso.includes(c.value))
      .map((c) => ({
        value: c.value,
        label: c.label,
        color: c.value,
      })),
  ], [coresEmUso]);

  return (
    <div className="flex flex-col max-h-[70vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden overflow-y-auto px-3">
          <Step1Geral register={register} errors={errors} setValue={setValue} watch={watch} defaultValues={defaultValues}
            aniversariantes={aniversariantes} addAniversariante={addAniversariante} removeAniversariante={removeAniversariante}
            updateAniversariante={updateAniversariante} encarregadosAdicionais={encarregadosAdicionais}
            addEncarregadoAdicional={addEncarregadoAdicional} removeEncarregadoAdicional={removeEncarregadoAdicional}
            updateEncarregadoAdicional={updateEncarregadoAdicional} salaOptions={salaOptions} monitorOptions={monitorOptions}
            currentMonitoresIds={currentMonitoresIds} handleMonitoresChange={handleMonitoresChange}
            etapaOptions={etapaOptions} currentEtapasIds={currentEtapasIds} handleEtapasChange={handleEtapasChange}
            extraItems={extraItems} extraGroups={extraGroups} selectedExtrasIds={selectedExtrasIds}
            handleExtrasChange={handleExtrasChange} extrasTexto={extrasTexto} setExtrasTexto={setExtrasTexto}
            totalEstimado={totalEstimado} watchedData={watchedData} corOptions={corOptions} menuOptions={menuOptions}
            showAniversarianteError={showAniversarianteError}
            showDataNascimentoError={showDataNascimentoError}
            disponibilidade={disponibilidade.data}
            disponibilidadeLoading={disponibilidade.isLoading}
            onVerificarDisponibilidade={() => disponibilidade.refetch()}
            onOpenSearchCliente={() => setShowClienteSearch(true)}
            coresEmUso={coresEmUso}
            slotOptions={slotOptions}
            horarioCustom={horarioCustom}
            setHorarioCustom={setHorarioCustom}
            onSelectSlot={handleSelectSlot}
            currentHorario={watchedHorario}
            menuWarning={menuWarning}
            isAdmin={isGlobalAdmin}
          />
        </div>
        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end shrink-0">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "A guardar..." : reserva ? "Guardar Alterações" : "Criar Reserva"}</Button>
        </div>
      </form>

      {/* ── Modal: Pesquisar cliente existente ── */}
      <ClienteSearchModal
        isOpen={showClienteSearch}
        onClose={() => setShowClienteSearch(false)}
        onSelect={handleClienteSelected}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STEP 1 — Configurações Gerais
// ════════════════════════════════════════════════════════════════
interface Step1Props {
  register: ReturnType<typeof useForm<ReservaFormData>>["register"];
  errors: ReturnType<typeof useForm<ReservaFormData>>["formState"]["errors"];
  setValue: ReturnType<typeof useForm<ReservaFormData>>["setValue"];
  watch: ReturnType<typeof useForm<ReservaFormData>>["watch"];
  defaultValues: ReservaFormData;
  aniversariantes: AniversarianteInput[];
  addAniversariante: () => void;
  removeAniversariante: (index: number) => void;
  updateAniversariante: (index: number, field: keyof AniversarianteInput, value: string) => void;
  encarregadosAdicionais: EncarregadoInput[];
  addEncarregadoAdicional: () => void;
  removeEncarregadoAdicional: (index: number) => void;
  updateEncarregadoAdicional: (index: number, field: keyof EncarregadoInput, value: string) => void;
  salaOptions: { value: string; label: string }[];
  monitorOptions: { value: string; text: string; selected: boolean }[];
  currentMonitoresIds: string[];
  handleMonitoresChange: (selected: string[]) => void;
  etapaOptions: { value: string; text: string; selected: boolean }[];
  currentEtapasIds: string[];
  handleEtapasChange: (selected: string[]) => void;
  extraItems: ExtraItem[];
  extraGroups: { grouped: Record<string, ExtraItem[]>; ungrouped: ExtraItem[] };
  selectedExtrasIds: string[];
  handleExtrasChange: (selected: string[]) => void;
  extrasTexto: Record<string, string>;
  setExtrasTexto: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  totalEstimado: number;
  watchedData: string;
  corOptions: { value: string; label: string; color?: string; disabled?: boolean }[];
  menuOptions: { value: string; label: string }[];
  menuWarning?: string;
  showAniversarianteError: boolean;
  showDataNascimentoError: boolean;
  disponibilidade?: DisponibilidadeResult;
  disponibilidadeLoading: boolean;
  onVerificarDisponibilidade: () => void;
  onOpenSearchCliente: () => void;
  coresEmUso: string[];
  slotOptions: { value: string; label: string; disabled?: boolean }[];
  horarioCustom: boolean;
  setHorarioCustom: (v: boolean) => void;
  onSelectSlot: (horaInicio: string) => void;
  currentHorario: string;
  isAdmin: boolean;
}

function Step1Geral({
  register, errors, setValue, watch, defaultValues, aniversariantes,
  addAniversariante, removeAniversariante, updateAniversariante,
  encarregadosAdicionais, addEncarregadoAdicional, removeEncarregadoAdicional, updateEncarregadoAdicional,
  salaOptions, monitorOptions, currentMonitoresIds, handleMonitoresChange,
  etapaOptions, currentEtapasIds, handleEtapasChange,
  extraItems, extraGroups, selectedExtrasIds, handleExtrasChange, extrasTexto, setExtrasTexto,
  totalEstimado, watchedData, corOptions, menuOptions, menuWarning,
  showAniversarianteError, showDataNascimentoError, disponibilidade, disponibilidadeLoading, onVerificarDisponibilidade, onOpenSearchCliente,
  coresEmUso,
  slotOptions, horarioCustom, setHorarioCustom, onSelectSlot, currentHorario,
  isAdmin,
}: Step1Props) {
  const currentCor = watch("cor") || defaultValues.cor || "";

  const renderExtraItem = useCallback((item: ExtraItem) => {
    const isSelected = selectedExtrasIds.includes(item.id);
    const showTexto = isSelected && item.requerTexto;
    return (
      <div key={item.id} className="flex flex-col gap-1.5">
        <button type="button"
          onClick={() => handleExtrasChange(isSelected ? selectedExtrasIds.filter((id) => id !== item.id) : [...selectedExtrasIds, item.id])}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors cursor-pointer ${
            isSelected ? "border-primary-300 bg-primary-50/50" : "border-border hover:border-gray-300"
          }`}>
          <span className="text-sm text-text-primary">{item.nome}</span>
          <span className="text-xs font-medium text-text-secondary">+{formatEuro(Number(item.precoUnitario) / 100)}</span>
        </button>
        {showTexto && (
          <InputField value={extrasTexto[item.id] ?? ""} onChange={(e) => setExtrasTexto((prev) => ({ ...prev, [item.id]: e.target.value }))}
            placeholder={`Descrever ${item.nome.toLowerCase()}...`}
          />
        )}
      </div>
    );
  }, [selectedExtrasIds, handleExtrasChange, extrasTexto, setExtrasTexto]);

  return (
    <div className="space-y-6">
      {/* ── Aniversariante(s) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Cake size={14} className="text-brand-500" /> Aniversariante(s) *
          </label>
          <button type="button" onClick={addAniversariante}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
            <Plus size={13} /> Adicionar
          </button>
        </div>
        {aniversariantes.map((aniv, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="w-3/5">
              <InputField value={aniv.nome} onChange={(e) => updateAniversariante(i, "nome", e.target.value)} placeholder="Nome da criança" error={showAniversarianteError && !aniv.nome.trim()} />
            </div>
            <div className="w-2/5">
              <DatePicker
                id={`aniv-data-${i}`}
                placeholder="Data nascimento"
                defaultDate={aniv.dataNascimento || undefined}
                onChange={([date]) => { if (date) updateAniversariante(i, "dataNascimento", toISODate(date)); }}
              />
            </div>
            {aniv.dataNascimento ? (
              <span className="text-sm font-bold text-brand-500 whitespace-nowrap py-3">
                {calcIdade(aniv.dataNascimento, watchedData || new Date().toISOString().split("T")[0])} anos
              </span>
            ) : null}
            {aniversariantes.length > 1 && (
              <button type="button" onClick={() => removeAniversariante(i)} className="p-2 text-text-muted hover:text-accent-red transition-colors"><Trash2 size={14} /></button>
            )}
          </div>
        ))}
        {showAniversarianteError && (
          <p className="text-xs text-error-500">É obrigatório indicar pelo menos um aniversariante.</p>
        )}
        {showDataNascimentoError && (
          <p className="text-xs text-error-500">A data de nascimento de cada aniversariante é obrigatória.</p>
        )}
      </div>

      {/* ── Encarregado Principal ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <User size={14} className="text-brand-500" /> Encarregado de Educação *
          </label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onOpenSearchCliente}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
              <Search size={13} /> Pesquisar Cliente
            </button>
            <button type="button" onClick={addEncarregadoAdicional}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
              <Plus size={13} /> Adicionar encarregado
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <InputField {...register("encarregadoNome")} placeholder="Nome do responsável" required error={!!errors.encarregadoNome} hint={errors.encarregadoNome?.message} />
          </div>
          <div className="flex-1">
            <InputField type="tel" {...register("encarregadoContacto")} placeholder="Telefone" required error={!!errors.encarregadoContacto} hint={errors.encarregadoContacto?.message} />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <InputField type="email" {...register("encarregadoEmail")} placeholder="Email" required error={!!errors.encarregadoEmail} hint={errors.encarregadoEmail?.message} />
          </div>
          <div className="w-40">
            <InputField {...register("encarregadoCodigoPostal")} placeholder="Código Postal" />
          </div>
          <div className="flex items-center shrink-0 pb-0.5">
            <Checkbox label="Adicionar aos clientes" checked={watch("adicionarCliente") ?? true} onChange={(checked) => setValue("adicionarCliente", checked)} />
          </div>
        </div>
        {encarregadosAdicionais.map((enc, i) => (
          <div key={i} className="p-3 rounded-lg bg-surface border border-border">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-600 text-xs font-bold">{i + 2}</div>
              <span className="text-xs font-semibold text-text-primary">Encarregado {i + 2}</span>
              <button type="button" onClick={() => removeEncarregadoAdicional(i)} className="ml-auto p-1 text-text-muted hover:text-accent-red transition-colors"><Trash2 size={13} /></button>
            </div>
            <InputField value={enc.nome} onChange={(e) => updateEncarregadoAdicional(i, "nome", e.target.value)} placeholder="Nome do encarregado" />
            <div className="flex gap-3 mt-2">
              <div className="flex-1"><InputField type="tel" value={enc.contacto} onChange={(e) => updateEncarregadoAdicional(i, "contacto", e.target.value)} placeholder="Telefone" /></div>
              <div className="flex-1"><InputField type="email" value={enc.email} onChange={(e) => updateEncarregadoAdicional(i, "email", e.target.value)} placeholder="Email" /></div>
              <div className="w-40"><InputField value={enc.codigoPostal} onChange={(e) => updateEncarregadoAdicional(i, "codigoPostal", e.target.value)} placeholder="Código Postal" /></div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Data · Hora · Duração · Sala ── */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Data *</label>
          <DatePicker
            id="festa-data"
            placeholder="Selecionar data"
            defaultDate={defaultValues.data || undefined}
            onChange={([date]) => { if (date) setValue("data", toISODate(date)); }}
          />
          {errors.data && <p className="mt-1 text-xs text-error-500">{errors.data.message}</p>}
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Horário *</label>
          {horarioCustom ? (
            <InputField type="time" {...register("horario")} error={!!errors.horario} hint={errors.horario?.message} />
          ) : (
            <Select
              options={slotOptions}
              placeholder="Seleccionar slot"
              value={currentHorario}
              onChange={onSelectSlot}
              error={!!errors.horario}
            />
          )}
        </div>
        {horarioCustom && (
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Duração *</label>
            <Select options={DURACAO_OPTIONS} placeholder="Seleccionar" value={String(defaultValues.duracaoMinutos)} onChange={(val) => setValue("duracaoMinutos", Number(val))} />
          </div>
        )}
        {isAdmin && (
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Hora do Lanche</label>
            <InputField type="time" {...register("horaLanche")} />
          </div>
        )}
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1"><MapPin size={12} /> Sala *</label>
          <Select options={salaOptions} placeholder="Seleccionar" value={defaultValues.localId} onChange={(val) => setValue("localId", val)} />
          {errors.localId && <p className="mt-1 text-xs text-error-500">{errors.localId.message}</p>}
        </div>
      </div>

      {/* ── Toggle: horário personalizado (fora dos slots) ── */}
      {isAdmin && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={horarioCustom}
            onChange={setHorarioCustom}
            label="Horário personalizado (fora dos slots)"
          />
          {!horarioCustom && slotOptions.length === 0 && (
            <span className="text-xs text-text-muted">Sem slots configurados — active a opção para definir a hora manualmente.</span>
          )}
        </div>
      )}

      {/* ── Bolo de Aniversário ── */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <Cake size={14} className="text-brand-500" /> Bolo de Aniversário
        </label>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Tipo de Bolo</label>
            <Select
              options={[
                { value: "", label: "Seleccionar..." },
                { value: "PAIS_TRAZEM", label: "Pais trazem o bolo" },
                { value: "A_DECIDIR", label: "Ainda vão decidir" },
                { value: "NOSSO_1KG", label: "Nosso bolo 1kg" },
                { value: "NOSSO_2KG", label: "Nosso bolo 2kg" },
                { value: "BOLO_ARTISTICO", label: "Bolo artístico" },
              ]}
              placeholder="Seleccionar..."
              value={watch("bolo") ?? ""}
              onChange={(val) => setValue("bolo", val)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary mb-1">Tema do Bolo</label>
            <InputField
              {...register("boloTema")}
              placeholder="Ex: Frozen, Cars, Princesas..."
              disabled={watch("bolo") === "PAIS_TRAZEM" || watch("bolo") === "A_DECIDIR" || !watch("bolo")}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-text-secondary mb-1">Quantidade</label>
            <InputField
              type="number"
              min={0}
              {...register("boloQuantidade", { valueAsNumber: true })}
              placeholder="0"
              disabled={watch("bolo") === "PAIS_TRAZEM" || watch("bolo") === "A_DECIDIR" || !watch("bolo")}
            />
          </div>
        </div>
      </div>

      {/* ── Verificação de disponibilidade (aviso apenas) ── */}
      {watch("data") && watch("horario") && watch("duracaoMinutos") && watch("localId") && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onVerificarDisponibilidade}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors">
            <Search size={14} /> Verificar disponibilidade
          </button>
          {disponibilidadeLoading && <span className="text-xs text-text-muted">A verificar...</span>}
          {disponibilidade && !disponibilidadeLoading && (
            disponibilidade.disponivel ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-50 border border-success-200 text-success-700 text-xs font-medium">
                <CheckCircle size={14} /> Sala disponível neste horário
              </span>
            ) : (
              <div className="flex-1 min-w-full rounded-lg bg-accent-orange-50 border border-accent-orange-200 p-2.5">
                <div className="flex items-center gap-1.5 text-accent-orange-700 text-xs font-semibold">
                  <AlertTriangle size={14} /> Sala ocupada neste horário
                </div>
                <div className="mt-1 space-y-0.5">
                  {disponibilidade.conflitos.map((c) => (
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

      {/* ── Menu ── */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Menu</label>
          <Select options={menuOptions} placeholder="Seleccionar menu" value={defaultValues.menuId ?? "NONE"} onChange={(val) => setValue("menuId", val === "NONE" ? undefined : val)} />
          {menuWarning && (
            <div className="flex items-center gap-1.5 mt-1">
              <AlertTriangle size={12} className="text-accent-orange shrink-0" />
              <p className="text-[11px] text-accent-orange-700">{menuWarning}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tema da Festa: oculto per pedido do cliente (12/07/2026) */}
      <div className="hidden" aria-hidden="true">
        <label className="block text-xs font-medium text-text-secondary mb-1">Tema da Festa</label>
        <InputField {...register("tema")} placeholder="Ex: Princesas, Super-Heróis..." />
      </div>

      {/* ── Etapas & Monitores: ocultos per pedido do cliente (12/07/2026) ──
          Monitores são do parque, não da festa. Etapas não são editadas na marcação.
          Campos mantidos para retrocompatibilidade. */}
      <div className="hidden" aria-hidden="true">
        <MultiSelect label="Monitores" options={monitorOptions} defaultSelected={currentMonitoresIds} onChange={handleMonitoresChange} placeholder="Seleccionar..." />
        <MultiSelect label="Etapas" options={etapaOptions} defaultSelected={currentEtapasIds} onChange={handleEtapasChange} placeholder="Seleccionar..." />
      </div>

      {/* ── Número de Crianças ── */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Nº Crianças Previstas *</label>
          <InputField
            type="number"
            {...register("previsaoCriancas", { valueAsNumber: true })}
            min={1}
            max={100}
            error={!!errors.previsaoCriancas}
            hint={errors.previsaoCriancas?.message}
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Nº Confirmadas</label>
          <InputField
            type="number"
            {...register("numCriancasConfirmadas", { valueAsNumber: true })}
            min={0}
            max={100}
            placeholder="Opcional"
          />
        </div>
      </div>

      {/* ── Extras agrupados por subcategoria ── */}
      {extraItems.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-text-primary mb-2 block">✨ Extras</label>
          <div className="space-y-3">
            {Object.entries(extraGroups.grouped).map(([sub, items]) => (
              <div key={sub}>
                <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">{sub}</p>
                <div className="flex flex-wrap gap-3">{items.map(renderExtraItem)}</div>
              </div>
            ))}
            {extraGroups.ungrouped.length > 0 && (
              <div>
                {Object.keys(extraGroups.grouped).length > 0 && (
                  <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">Outros</p>
                )}
                <div className="flex flex-wrap gap-3">{extraGroups.ungrouped.map(renderExtraItem)}</div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Outros Extras (não listados)</label>
          <textarea
            {...register("outrosExtras")}
            placeholder="Outros itens ou extras não listados acima..."
            rows={2}
            className="w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 bg-transparent text-gray-900 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Brindes</label>
          <textarea
            {...register("observacoesBrindes")}
            placeholder="Informações sobre brindes, presentes..."
            rows={2}
            className="w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 bg-transparent text-gray-900 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
      </div>
      {totalEstimado > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary-50 border border-primary-200">
          <span className="text-sm font-medium text-text-secondary">Total Extras</span>
          <span className="text-lg font-bold text-primary-500">{formatEuro(totalEstimado / 100)}</span>
        </div>
      )}

      {/* ── Notas & Observações (final da marcação) ── */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <FileText size={14} className="text-text-muted" /> Notas & Observações
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Notas — Cacifos</label>
            <textarea
              {...register("notasCacifos")}
              placeholder="Instruções para a equipa de cacifos (alergias, restrições, pedidos especiais)..."
              rows={2}
              className="w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 bg-transparent text-gray-900 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Notas — Lanche</label>
            <textarea
              {...register("notasLanche")}
              placeholder="Instruções para a equipa de lanche (alergias, restrições alimentares)..."
              rows={2}
              className="w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 bg-transparent text-gray-900 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Lesões / Alergias</label>
            <textarea
              {...register("observacoesLesoes")}
              placeholder="Alergias alimentares, lesões, condições médicas..."
              rows={2}
              className="w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 bg-transparent text-gray-900 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Observações Gerais</label>
            <textarea
              {...register("observacoesGerais")}
              placeholder="Outras observações relevantes para a festa..."
              rows={2}
              className="w-full rounded-lg border px-4 py-2.5 text-sm border-gray-300 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 bg-transparent text-gray-900 dark:text-gray-300 dark:bg-gray-900 dark:border-gray-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

