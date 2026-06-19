"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, CreditCard, AlertTriangle, User, Cake, MapPin,
  Clock, Package, Users, Check, FileText, MessageSquare, Search, CheckCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { Button } from "@/components/ui";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import { Select } from "@/components/ui/select";
import Switch from "@/components/form/switch/Switch";
import MultiSelect from "@/components/form/MultiSelect";
import Checkbox from "@/components/form/input/Checkbox";
import { FormStepper } from "@/components/ui/stepper/FormStepper";
import { useCreateReserva, useUpdateReserva, useCheckDisponibilidade } from "@/hooks/use-reservas";
import { useLocaisAtivos } from "@/hooks/use-locais";
import { useExtras } from "@/hooks/use-extras";
import { useMonitores } from "@/hooks/use-monitores";
import { useEtapasFesta } from "@/hooks/use-etapasFesta";
import { useCacifosDisponiveis } from "@/hooks/use-cacifos";
import { useConfigPreco } from "@/hooks/use-precos";
import ClienteSearchModal, { type ClienteFilho } from "@/components/common/ClienteSearchModal";
import type { Cliente } from "@/lib/api/clientes";
import type { Reserva, MetodoPagamento, DisponibilidadeResult } from "@/lib/api/reservas";

// ── Types ──────────────────────────────────────────────────────
interface AniversarianteInput { nome: string; dataNascimento: string; }
interface CriancaInput { nome: string; cacifoId: string; edited?: boolean; }
interface EncarregadoInput { nome: string; contacto: string; email: string; codigoPostal: string; }

interface ExtraItem {
  id: string; nome: string; precoUnitario: number;
  subcategoria?: string; requerTexto?: boolean; icone?: string;
}

// ── Cores pré-definidas ────────────────────────────────────────
const CORES_PREDEFINIDAS = [
  { value: "#E74C3C", label: "Vermelho" }, { value: "#E91E63", label: "Rosa" },
  { value: "#9B59B6", label: "Roxo" }, { value: "#673AB7", label: "Violeta" },
  { value: "#3F51B5", label: "Índigo" }, { value: "#2196F3", label: "Azul" },
  { value: "#03A9F4", label: "Azul Claro" }, { value: "#00BCD4", label: "Ciano" },
  { value: "#009688", label: "Teal" }, { value: "#4CAF50", label: "Verde" },
  { value: "#8BC34A", label: "Verde Claro" }, { value: "#CDDC39", label: "Lima" },
  { value: "#FFEB3B", label: "Amarelo" }, { value: "#FFC107", label: "Âmbar" },
  { value: "#FF9800", label: "Laranja" }, { value: "#FF5722", label: "Laranja Escuro" },
  { value: "#795548", label: "Castanho" }, { value: "#9E9E9E", label: "Cinza" },
  { value: "#607D8B", label: "Azul Cinzento" }, { value: "#F48FB1", label: "Rosa Pastel" },
];

// ── Zod Schema ─────────────────────────────────────────────────
const reservaSchema = z.object({
  tema: z.string().optional(),
  data: z.string().min(1, "Data é obrigatória"),
  horario: z.string().min(1, "Horário é obrigatório"),
  duracaoMinutos: z.number().min(30, "Duração mínima é 30 minutos"),
  localId: z.string().min(1, "Seleccione uma sala"),
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoContacto: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  encarregadoCodigoPostal: z.string().optional(),
  adicionarCliente: z.boolean().optional(),
  monitoresIds: z.array(z.string()).optional(),
  etapasIds: z.array(z.string()).optional(),
  cor: z.string().optional(),
  menuId: z.string().optional(),
  previsaoCriancas: z.number().min(1, "Mínimo 1 criança").max(100),
  metodoPagamento: z.string().optional(),
  valorPago: z.number().min(0).optional(),
  pago: z.boolean().optional(),
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

interface ReservaFormProps { reserva?: Reserva | null; onClose: () => void; }

const DURACAO_OPTIONS = [
  { value: "60", label: "1h" }, { value: "90", label: "1h30" },
  { value: "120", label: "2h" }, { value: "150", label: "2h30" },
  { value: "180", label: "3h" },
];

const STEPS = [
  { key: "geral", label: "Configuração Geral", icon: <Cake size={14} /> },
  { key: "criancas", label: "Crianças", icon: <Users size={14} /> },
  { key: "cacifos", label: "Cacifos", icon: <Package size={14} /> },
  { key: "resumo", label: "Resumo & Pagamento", icon: <CreditCard size={14} /> },
];

function formatEuro(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

/** Formats a Date object as YYYY-MM-DD for backend */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
export default function FestaForm({ reserva, onClose }: ReservaFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const createReserva = useCreateReserva();
  const updateReserva = useUpdateReserva();
  const { data: locais } = useLocaisAtivos();
  const { data: extras } = useExtras();
  const { data: monitores } = useMonitores();
  const { data: etapas } = useEtapasFesta();
  const { data: cacifosDisponiveis } = useCacifosDisponiveis();

  const extraItems = useMemo<ExtraItem[]>(
    () => (extras ?? []).filter((e) => e.categoria === "EXTRA" && e.activo) as ExtraItem[],
    [extras]
  );

  const extraGroups = useMemo(() => groupBySubcategoria(extraItems), [extraItems]);

  const salaOptions = useMemo(
    () => (locais ?? []).map((l) => ({ value: l.id, label: `${l.nome} (${l.capacidade} crianças)` })),
    [locais]
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
  const [criancas, setCriancas] = useState<CriancaInput[]>([]);
  const [cacifoAssignments, setCacifoAssignments] = useState<Record<string, string>>({});
  const [showAniversarianteError, setShowAniversarianteError] = useState(false);
  // Controla a modal de pesquisa de cliente existente
  const [showClienteSearch, setShowClienteSearch] = useState(false);

  const defaultValues = useMemo<ReservaFormData>(() => ({
    tema: reserva?.tema ?? "", data: reserva?.data ?? "", horario: reserva?.horario ?? "",
    duracaoMinutos: reserva?.duracaoMinutos ?? 120, localId: reserva?.localId ?? "",
    encarregadoNome: reserva?.cliente?.nome ?? "",
    encarregadoContacto: reserva?.cliente?.telefone ?? "",
    encarregadoEmail: reserva?.cliente?.email ?? "",
    encarregadoCodigoPostal: reserva?.cliente?.codigoPostal ?? "",
    adicionarCliente: true,
    monitoresIds: reserva?.monitores?.map((m) => m.monitor.id) ?? [],
    etapasIds: reserva?.etapas?.map((e) => e.etapa.id) ?? [],
    cor: reserva?.cor ?? "", menuId: "",
    previsaoCriancas: reserva?.numCriancas ?? reserva?.previsaoCriancas ?? 10,
    metodoPagamento: reserva?.metodoPagamento ?? "", valorPago: reserva?.valorPago ?? 0,
    pago: reserva?.pago ?? false,
    observacoesGerais: reserva?.observacoesGerais ?? "", observacoesLesoes: reserva?.observacoesLesoes ?? "",
    observacoesBrindes: reserva?.observacoesBrindes ?? "", outrosExtras: reserva?.outrosExtras ?? "",
    caucao: reserva?.caucao ?? "", referenciaPagamento: reserva?.referenciaPagamento ?? "",
    boloQuantidade: reserva?.boloQuantidade ?? undefined,
    valorCaucao: reserva?.valorCaucao ? Number(reserva.valorCaucao) : undefined,
    descontoPercentagem: reserva?.descontoPercentagem ?? undefined,
    descontoMotivo: reserva?.descontoMotivo ?? "",
  }), [reserva]);

  const { register, handleSubmit, setValue, watch, trigger, formState: { errors, isSubmitting } } = useForm<ReservaFormData>({
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
    const preco = isFimSemana
      ? Number(configPreco.precoFestaFimSemana)
      : Number(configPreco.precoFestaSemana);
    setValue("valorPago", preco);
  }, [watchedData, configPreco, setValue, reserva?.valorPago]);

  React.useEffect(() => {
    const count = previsaoCriancas ?? 0;
    const anivNames = aniversariantes.filter((a) => a.nome.trim()).map((a) => a.nome);
    setCriancas((prev) => {
      const next: CriancaInput[] = [];
      for (let i = 0; i < count; i++) {
        const existing = prev[i];
        const autoName = anivNames[i] ?? "";
        // Preserva nomes editados manualmente; caso contrário sincroniza
        // sempre com o nome do aniversariante (ou limpa). Isto evita o bug
        // em que a 1ª tecla "trancava" o nome da criança numa só letra.
        if (existing && existing.edited) next.push(existing);
        else next.push({ nome: autoName, cacifoId: existing?.cacifoId ?? "", edited: false });
      }
      return next;
    });
  }, [previsaoCriancas, aniversariantes]);

  React.useEffect(() => {
    if (currentStep !== 2 || !cacifosDisponiveis) return;
    setCacifoAssignments((prev) => {
      const next = { ...prev };
      const available = cacifosDisponiveis.filter((c) => c.estado === "LIVRE");
      let idx = 0;
      for (const c of criancas) { if (!next[c.nome] && available[idx]) { next[c.nome] = available[idx].id; idx++; } }
      return next;
    });
  }, [currentStep, cacifosDisponiveis, criancas]);

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
  const updateCrianca = useCallback((i: number, nome: string) => {
    setCriancas((p) => { const n = [...p]; n[i] = { ...n[i], nome, edited: true }; return n; });
  }, []);
  const addCrianca = useCallback(() => {
    setCriancas((p) => [...p, { nome: "", cacifoId: "", edited: false }]);
    setValue("previsaoCriancas", (previsaoCriancas ?? 0) + 1);
  }, [previsaoCriancas, setValue]);
  const removeCrianca = useCallback((i: number) => {
    setCriancas((p) => p.filter((_, idx) => idx !== i));
    setValue("previsaoCriancas", Math.max(0, (previsaoCriancas ?? 1) - 1));
  }, [previsaoCriancas, setValue]);

  const validateStep = useCallback(async (): Promise<boolean> => {
    if (currentStep === 0) {
      const valid = await trigger(["data", "horario", "duracaoMinutos", "localId", "encarregadoNome", "encarregadoContacto", "encarregadoEmail"]);
      const hasAniversariante = aniversariantes.some((a) => a.nome.trim().length > 0);
      setShowAniversarianteError(!hasAniversariante);
      return valid && hasAniversariante;
    }
    if (currentStep === 1) return (await trigger(["previsaoCriancas"]));
    return true;
  }, [currentStep, trigger, aniversariantes]);

  const handleNext = useCallback(async () => {
    if ((await validateStep()) && currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
  }, [currentStep, validateStep]);
  const handlePrev = useCallback(() => { if (currentStep > 0) setCurrentStep((s) => s - 1); }, [currentStep]);

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
      extrasIds: selectedExtrasIds.length > 0 ? selectedExtrasIds : undefined,
      extrasTexto: Object.fromEntries(Object.entries(extrasTexto).filter(([, v]) => v.trim())),
      monitoresIds: data.monitoresIds, etapasIds: data.etapasIds,
      cor: data.cor || undefined, menuId: data.menuId || undefined,
      metodoPagamento: (data.metodoPagamento || undefined) as MetodoPagamento | undefined,
      valorPago: data.valorPago || undefined, pago: data.pago, notas: obsGerais,
      observacoesGerais: data.observacoesGerais || undefined,
      observacoesLesoes: data.observacoesLesoes || undefined,
      observacoesBrindes: data.observacoesBrindes || undefined,
      outrosExtras: data.outrosExtras || undefined,
      caucao: data.caucao || undefined, referenciaPagamento: data.referenciaPagamento || undefined,
      boloQuantidade: data.boloQuantidade || undefined,
      valorCaucao: data.valorCaucao || undefined,
      descontoPercentagem: data.descontoPercentagem || undefined,
      descontoMotivo: data.descontoMotivo || undefined,
      participantes: criancas.filter((c) => c.nome.trim()).map((c) => ({ nome: c.nome, cacifoId: cacifoAssignments[c.nome] || undefined })),
      aniversariantes: aniversariantes.filter((a) => a.nome.trim()).map((a) => ({ nome: a.nome, dataNascimento: a.dataNascimento || undefined })),
    };
    if (reserva) await updateReserva.mutateAsync({ id: reserva.id, data: payload });
    else await createReserva.mutateAsync(payload);
    onClose();
  }, [reserva, aniversariantes, encarregadosAdicionais, criancas, cacifoAssignments, selectedExtrasIds, extrasTexto, updateReserva, createReserva, onClose]);

  const cacifoOptions = useMemo(() => {
    const available = cacifosDisponiveis?.filter((c) => c.estado === "LIVRE") ?? [];
    return available.map((c) => ({ value: c.id, label: `#${c.numero}${c.nome ? ` — ${c.nome}` : ""}` }));
  }, [cacifosDisponiveis]);
  const corOptions = useMemo(() => [
    { value: "NONE", label: "Sem cor" },
    ...CORES_PREDEFINIDAS.map((c) => ({ value: c.value, label: c.label, color: c.value }))
  ], []);

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="mb-6 shrink-0"><FormStepper steps={STEPS} currentStep={currentStep} onStepChange={setCurrentStep} /></div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden overflow-y-auto px-3">
          {currentStep === 0 && (
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
              disponibilidade={disponibilidade.data}
              disponibilidadeLoading={disponibilidade.isLoading}
              onVerificarDisponibilidade={() => disponibilidade.refetch()}
              onOpenSearchCliente={() => setShowClienteSearch(true)}
            />
          )}
          {currentStep === 1 && (
            <Step2Criancas register={register} errors={errors} watch={watch} criancas={criancas} updateCrianca={updateCrianca}
              addCrianca={addCrianca} removeCrianca={removeCrianca} aniversariantes={aniversariantes}
            />
          )}
          {currentStep === 2 && (
            <Step3Cacifos criancas={criancas} cacifoAssignments={cacifoAssignments} setCacifoAssignments={setCacifoAssignments}
              cacifoOptions={cacifoOptions} cacifosDisponiveis={cacifosDisponiveis}
            />
          )}
          {currentStep === 3 && (
            <Step4Resumo register={register} errors={errors} setValue={setValue} watch={watch} defaultValues={defaultValues}
              aniversariantes={aniversariantes} criancas={criancas} cacifoAssignments={cacifoAssignments}
              cacifosDisponiveis={cacifosDisponiveis} totalEstimado={totalEstimado} pago={pago}
              salaOptions={salaOptions} encarregadosAdicionais={encarregadosAdicionais}
              valorPagoEditedRef={valorPagoEditedRef}
            />
          )}
        </div>
        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end shrink-0">
          <Button variant="outline" onClick={onClose} type="button">Cancelar</Button>
          {currentStep > 0 && <Button variant="outline" onClick={handlePrev} type="button">← Anterior</Button>}
          {currentStep < STEPS.length - 1
            ? <Button onClick={handleNext} type="button">Próximo →</Button>
            : <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "A guardar..." : reserva ? "Guardar Alterações" : "Criar Reserva"}</Button>
          }
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
  corOptions: { value: string; label: string; color?: string }[];
  menuOptions: { value: string; label: string }[];
  showAniversarianteError: boolean;
  disponibilidade?: DisponibilidadeResult;
  disponibilidadeLoading: boolean;
  onVerificarDisponibilidade: () => void;
  onOpenSearchCliente: () => void;
}

function Step1Geral({
  register, errors, setValue, watch, defaultValues, aniversariantes,
  addAniversariante, removeAniversariante, updateAniversariante,
  encarregadosAdicionais, addEncarregadoAdicional, removeEncarregadoAdicional, updateEncarregadoAdicional,
  salaOptions, monitorOptions, currentMonitoresIds, handleMonitoresChange,
  etapaOptions, currentEtapasIds, handleEtapasChange,
  extraItems, extraGroups, selectedExtrasIds, handleExtrasChange, extrasTexto, setExtrasTexto,
  totalEstimado, watchedData, corOptions, menuOptions,
  showAniversarianteError, disponibilidade, disponibilidadeLoading, onVerificarDisponibilidade, onOpenSearchCliente,
}: Step1Props) {
  const currentCor = defaultValues.cor || "";

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
          <InputField type="time" {...register("horario")} error={!!errors.horario} hint={errors.horario?.message} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Duração *</label>
          <Select options={DURACAO_OPTIONS} placeholder="Seleccionar" value={String(defaultValues.duracaoMinutos)} onChange={(val) => setValue("duracaoMinutos", Number(val))} />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1"><MapPin size={12} /> Sala *</label>
          <Select options={salaOptions} placeholder="Seleccionar" value={defaultValues.localId} onChange={(val) => setValue("localId", val)} />
          {errors.localId && <p className="mt-1 text-xs text-error-500">{errors.localId.message}</p>}
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

      {/* ── Tema · Cor · Menu · Bolo ── */}
      <div className="flex gap-4">
        <div className="flex-[2]">
          <label className="block text-xs font-medium text-text-secondary mb-1">Tema da Festa</label>
          <InputField {...register("tema")} placeholder="Ex: Princesas, Super-Heróis..." />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Cor</label>
          <div className="relative">
            <Select options={corOptions} placeholder="Escolher cor" value={currentCor || "NONE"} onChange={(val) => setValue("cor", val === "NONE" ? "" : val)} showColorIndicators={true} />
            {currentCor && (<div className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-gray-300" style={{ backgroundColor: currentCor }} />)}
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Menu</label>
          <Select options={menuOptions} placeholder="Seleccionar menu" value={defaultValues.menuId ?? "NONE"} onChange={(val) => setValue("menuId", val === "NONE" ? undefined : val)} />
        </div>
        <div className="w-28">
          <label className="block text-xs font-medium text-text-secondary mb-1">Bolo (qtd)</label>
          <InputField type="number" min={0} {...register("boloQuantidade", { valueAsNumber: true })} placeholder="0" />
        </div>
      </div>

      {/* ── Monitores · Etapas ── */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Monitores</label>
          <MultiSelect label="Monitores" options={monitorOptions} defaultSelected={currentMonitoresIds} onChange={handleMonitoresChange} placeholder="Seleccionar..." />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-text-secondary mb-1">Etapas de Festa</label>
          <MultiSelect label="Etapas" options={etapaOptions} defaultSelected={currentEtapasIds} onChange={handleEtapasChange} placeholder="Seleccionar..." />
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
      {totalEstimado > 0 && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary-50 border border-primary-200">
          <span className="text-sm font-medium text-text-secondary">Total Extras</span>
          <span className="text-lg font-bold text-primary-500">{formatEuro(totalEstimado / 100)}</span>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STEP 2 — Crianças
// ════════════════════════════════════════════════════════════════
interface Step2Props {
  register: ReturnType<typeof useForm<ReservaFormData>>["register"];
  errors: ReturnType<typeof useForm<ReservaFormData>>["formState"]["errors"];
  watch: ReturnType<typeof useForm<ReservaFormData>>["watch"];
  criancas: CriancaInput[]; updateCrianca: (i: number, nome: string) => void;
  addCrianca: () => void; removeCrianca: (i: number) => void;
  aniversariantes: AniversarianteInput[];
}

function Step2Criancas({ register, errors, criancas, updateCrianca, addCrianca, removeCrianca, aniversariantes }: Step2Props) {
  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5"><Users size={16} className="text-brand-500" /> Crianças Participantes</h3>
          <p className="text-xs text-text-muted mt-0.5">Defina o número previsto e preencha os nomes.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-secondary">Nº previsto:</label>
          <div className="w-20">
            <InputField type="number" {...register("previsaoCriancas", { valueAsNumber: true })} min={1} max={100} error={!!errors.previsaoCriancas} hint={errors.previsaoCriancas?.message} />
          </div>
        </div>
      </div>
      {aniversariantes.filter((a) => a.nome.trim()).length > 0 && (
        <div className="p-2.5 rounded-lg bg-brand-50 border border-brand-200 flex items-center gap-2 shrink-0">
          <Cake size={14} className="text-brand-500 shrink-0" />
          <p className="text-xs text-brand-700">Aniversariante(s): <strong>{aniversariantes.filter((a) => a.nome.trim()).map((a) => a.nome).join(", ")}</strong> — incluídos automaticamente.</p>
        </div>
      )}
      <div className="max-h-[35vh] space-y-2 overflow-y-auto p-1">
        {criancas.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-xs font-medium text-text-muted text-center">{i + 1}</span>
            <div className="flex-1"><InputField value={c.nome} onChange={(e) => updateCrianca(i, e.target.value)} placeholder={`Nome da criança ${i + 1}`} /></div>
            {criancas.length > 1 && (<button type="button" onClick={() => removeCrianca(i)} className="p-2 text-text-muted hover:text-accent-red transition-colors"><Trash2 size={14} /></button>)}
          </div>
        ))}
      </div>
      <button type="button" onClick={addCrianca} className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-brand-500 hover:bg-brand-50 rounded-lg transition-colors shrink-0">
        <Plus size={14} /> Adicionar criança
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STEP 3 — Cacifos
// ════════════════════════════════════════════════════════════════
interface Step3Props {
  criancas: CriancaInput[]; cacifoAssignments: Record<string, string>;
  setCacifoAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cacifoOptions: { value: string; label: string }[];
  cacifosDisponiveis: { id: string; numero: number; nome?: string | null; estado: string }[] | undefined;
}

function Step3Cacifos({ criancas, cacifoAssignments, setCacifoAssignments, cacifoOptions, cacifosDisponiveis }: Step3Props) {
  const named = criancas.filter((c) => c.nome.trim());
  const avail = cacifosDisponiveis?.filter((c) => c.estado === "LIVRE").length ?? 0;
  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      <div className="shrink-0">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5"><Package size={16} className="text-brand-500" /> Atribuição de Cacifos</h3>
        <p className="text-xs text-text-muted mt-0.5">Cacifos atribuídos automaticamente. Pode alterar manualmente.</p>
      </div>
      {named.length > avail && (
        <div className="p-2.5 rounded-lg bg-accent-orange-50 border border-accent-orange-200 flex items-center gap-2 shrink-0">
          <AlertTriangle size={14} className="text-accent-orange shrink-0" />
          <p className="text-xs text-accent-orange-700"><strong>{named.length}</strong> crianças mas apenas <strong>{avail}</strong> cacifos disponíveis.</p>
        </div>
      )}
      <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-3">
        {named.length > 0 ? named.map((c, i) => {
          const assignedId = cacifoAssignments[c.nome] ?? "";
          const cacifo = cacifosDisponiveis?.find((cf) => cf.id === assignedId);
          return (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface border border-border">
              <span className="w-6 text-xs font-medium text-text-muted text-center">{i + 1}</span>
              <div className="flex-1"><p className="text-sm font-medium text-text-primary">{c.nome}</p></div>
              <div className="w-44"><Select options={cacifoOptions} placeholder="Atribuir cacifo" value={assignedId} onChange={(val) => setCacifoAssignments((prev) => ({ ...prev, [c.nome]: val }))} /></div>
              {cacifo && (<span className="text-xs font-medium text-accent-green-600 flex items-center gap-1"><Check size={12} /> #{cacifo.numero}</span>)}
            </div>
          );
        }) : (
          <div className="text-center py-8"><Users size={32} className="mx-auto text-text-muted mb-2" /><p className="text-sm text-text-muted">Nenhuma criança com nome preenchido.</p></div>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-text-muted shrink-0">
        <span>Disponíveis: <strong>{avail}</strong></span><span>Crianças: <strong>{named.length}</strong></span>
        <span>Atribuídos: <strong>{Object.values(cacifoAssignments).filter(Boolean).length}</strong></span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// STEP 4 — Resumo & Pagamento
// ════════════════════════════════════════════════════════════════
interface Step4Props {
  register: ReturnType<typeof useForm<ReservaFormData>>["register"];
  errors: ReturnType<typeof useForm<ReservaFormData>>["formState"]["errors"];
  setValue: ReturnType<typeof useForm<ReservaFormData>>["setValue"];
  watch: ReturnType<typeof useForm<ReservaFormData>>["watch"];
  defaultValues: ReservaFormData;
  aniversariantes: AniversarianteInput[]; criancas: CriancaInput[];
  cacifoAssignments: Record<string, string>;
  cacifosDisponiveis: { id: string; numero: number; nome?: string | null; estado: string }[] | undefined;
  totalEstimado: number; pago: boolean;
  salaOptions: { value: string; label: string }[];
  encarregadosAdicionais: EncarregadoInput[];
  valorPagoEditedRef: React.MutableRefObject<boolean>;
}

function Step4Resumo({ register, setValue, watch, defaultValues, aniversariantes, criancas, cacifoAssignments, cacifosDisponiveis, totalEstimado, pago, salaOptions, encarregadosAdicionais, valorPagoEditedRef }: Step4Props) {
  const namedCriancas = criancas.filter((c) => c.nome.trim());
  const sala = salaOptions.find((s) => s.value === watch("localId"));
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-surface border border-border">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5 mb-3"><FileText size={14} className="text-brand-500" /> Resumo</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2"><Cake size={14} className="text-brand-500 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Aniversariante(s)</p><p className="text-sm font-medium text-text-primary">{aniversariantes.filter((a) => a.nome.trim()).map((a) => a.nome).join(", ") || "—"}</p></div></div>
          <div className="flex items-start gap-2"><User size={14} className="text-brand-500 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Encarregado</p><p className="text-sm text-text-primary">{watch("encarregadoNome") || "—"}</p><p className="text-xs text-text-muted">{watch("encarregadoContacto")} · {watch("encarregadoEmail")}{watch("encarregadoCodigoPostal") ? ` · ${watch("encarregadoCodigoPostal")}` : ""}</p></div></div>
          {encarregadosAdicionais.filter((e) => e.nome.trim()).length > 0 && (
            <div className="flex items-start gap-2"><Users size={14} className="text-primary-400 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Outros Encarregados</p>{encarregadosAdicionais.filter((e) => e.nome.trim()).map((enc, i) => (<div key={i}><p className="text-sm text-text-primary">{enc.nome}</p><p className="text-xs text-text-muted">{[enc.contacto, enc.email].filter(Boolean).join(" · ")}</p></div>))}</div></div>
          )}
          <div className="flex items-start gap-2"><Clock size={14} className="text-brand-500 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Data & Hora</p><p className="text-sm text-text-primary">{watch("data") ? format(parseISO(watch("data")), "d 'de' MMMM 'de' yyyy", { locale: pt }) : "—"} às {watch("horario") || "—"} ({watch("duracaoMinutos")} min)</p></div></div>
          <div className="flex items-start gap-2"><MapPin size={14} className="text-brand-500 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Sala</p><p className="text-sm text-text-primary">{sala?.label ?? "—"}</p></div></div>
          <div className="flex items-start gap-2"><Users size={14} className="text-brand-500 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Crianças</p><p className="text-sm text-text-primary">{namedCriancas.length > 0 ? `${namedCriancas.length} — ${namedCriancas.slice(0, 5).map((c) => c.nome).join(", ")}${namedCriancas.length > 5 ? "..." : ""}` : `${watch("previsaoCriancas")} previstas`}</p></div></div>
            <div className="flex items-start gap-2"><Package size={14} className="text-brand-500 mt-0.5 shrink-0" /><div><p className="text-[10px] text-text-muted uppercase tracking-wider">Cacifos</p><p className="text-sm text-text-primary">{Object.values(cacifoAssignments).filter(Boolean).length > 0 ? cacifosDisponiveis?.filter((c) => Object.values(cacifoAssignments).includes(c.id)).map((c) => `#${c.numero}`).join(", ") ?? "Nenhum" : "Nenhum"}</p></div></div>
          </div>
        </div>
        {(watch("tema") || watch("cor")) && (
          <div className="p-3 rounded-lg bg-surface border border-border flex items-center gap-3">
            {watch("cor") && <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: watch("cor") }} />}
            <span className="text-sm text-text-primary">Tema: {watch("tema") || "—"}</span>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5"><MessageSquare size={14} className="text-brand-500" /> Observações</h3>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Observações gerais</label><TextArea placeholder="Notas gerais..." value={watch("observacoesGerais") ?? ""} onChange={(v) => setValue("observacoesGerais", v)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Lesões / Alergias</label><TextArea placeholder="Alergias..." value={watch("observacoesLesoes") ?? ""} onChange={(v) => setValue("observacoesLesoes", v)} rows={2} /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Brindes</label><TextArea placeholder="Brindes..." value={watch("observacoesBrindes") ?? ""} onChange={(v) => setValue("observacoesBrindes", v)} rows={2} /></div>
          </div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Outros extras</label><TextArea placeholder="Outros itens..." value={watch("outrosExtras") ?? ""} onChange={(v) => setValue("outrosExtras", v)} rows={2} /></div>
        </div>
        <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary"><CreditCard size={14} /> Pagamento</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Método</label>
              <Select options={[{ value: "NONE", label: "Não definido" }, { value: "DINHEIRO", label: "Dinheiro" }, { value: "MULTIBANCO", label: "Multibanco" }, { value: "MBWAY", label: "MB WAY" }, { value: "TRANSFERENCIA", label: "Transferência" }, { value: "CARTAO", label: "Cartão" }, { value: "OUTRO", label: "Outro" }]} placeholder="Método" value={defaultValues.metodoPagamento ?? "NONE"} onChange={(val) => setValue("metodoPagamento", val === "NONE" ? undefined : val)} />
            </div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Valor Total (€)</label><InputField type="number" step={0.01} min={0} value={watch("valorPago") as number} onChange={(e) => { valorPagoEditedRef.current = true; setValue("valorPago", e.target.value === "" ? 0 : parseFloat(e.target.value)); }} placeholder="0,00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Caução</label>
              <Select options={[{ value: "NONE", label: "Não definido" }, { value: "NAO_PAGA", label: "Não paga" }, { value: "PAGA", label: "Paga" }, { value: "PAGA_NO_DIA", label: "Paga no dia" }]} placeholder="Caução" value={defaultValues.caucao ?? "NONE"} onChange={(val) => setValue("caucao", val === "NONE" ? undefined : val)} />
            </div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Valor Caução (€)</label><InputField type="number" step={0.01} min={0} {...register("valorCaucao", { valueAsNumber: true })} placeholder="0,00" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Desconto Menu (%)</label><InputField type="number" min={0} max={100} {...register("descontoPercentagem", { valueAsNumber: true })} placeholder="0" /></div>
            <div><label className="block text-xs font-medium text-text-secondary mb-1">Motivo Desconto</label><InputField {...register("descontoMotivo")} placeholder="Motivo do desconto" /></div>
          </div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">Ref. Pagamento</label><InputField {...register("referenciaPagamento")} placeholder="Referência" /></div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-secondary">Pago</label>
            <Switch checked={pago} onChange={(checked) => setValue("pago", checked)} label={pago ? "Sim" : "Não"} />
          </div>
          {/* ── Discriminação de totais ── */}
          <div className="pt-2 border-t border-border space-y-1.5">
            {totalEstimado > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Extras</span>
                <span className="text-xs text-text-primary">{formatEuro(totalEstimado / 100)}</span>
              </div>
            )}
            {watch("valorCaucao") ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Caução</span>
                <span className="text-xs text-text-primary">{formatEuro(Number(watch("valorCaucao")))}</span>
              </div>
            ) : null}
            {watch("descontoPercentagem") ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Desconto</span>
                <span className="text-xs text-success-600">−{watch("descontoPercentagem")}%</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1.5 border-t border-border">
              <span className="text-sm font-semibold text-text-primary">Total a pagar</span>
              <span className="text-base font-bold text-primary-500">{formatEuro(Number(watch("valorPago")) || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}