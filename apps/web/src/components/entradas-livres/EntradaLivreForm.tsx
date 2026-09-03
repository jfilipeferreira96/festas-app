"use client";

import React, { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, CreditCard, User, Users,
  Clock, Package, MessageSquare, Search,
  CheckCircle2, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { Select } from "@/components/ui/select";
import Switch from "@/components/form/switch/Switch";
import Checkbox from "@/components/form/input/Checkbox";
import ClienteSearchModal, { type ClienteFilho } from "@/components/common/ClienteSearchModal";
import { METODO_PAGAMENTO_OPTIONS } from "@/lib/metodo-pagamento";
import EntradaLivrePagamentoModal from "@/components/entradas-livres/EntradaLivrePagamentoModal";
import type { Cliente } from "@/lib/api/clientes";
import {
  useCriarEntradaLivre,
  useAtualizarEntradaLivre,
} from "@/hooks/use-entrada-livre";
import { useCacifos } from "@/hooks/use-cacifos";
import { useExtras } from "@/hooks/use-extras";
import { useConfigPreco } from "@/hooks/use-precos";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

// ── Zod Schema ─────────────────────────────────────────────────
const entradaLivreSchema = z.object({
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoTelefone: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  duracaoMinutos: z.number().min(60, "Duração mínima é 1 hora"),
  custoTotal: z.number().min(0, "O custo não pode ser negativo").optional(),
  metodoPagamento: z.string().optional(),
  // pago é obrigatório: o utilizador tem de seleccionar explicitamente "Pago" ou "Não pago".
  pago: z.boolean({ message: "É obrigatório indicar o estado do pagamento" }),
  cacifoId: z.string().optional(),
  observacoes: z.string().optional(),
  observacoesLesoes: z.string().optional(),
  // Lanche
  temLanche: z.boolean().optional(),
  horaLanche: z.string().optional(),
  // Adultos (encarregados que acompanham e pagam)
  numAdultos: z.number().min(0).optional(),
  // Pagamento dividido (2º método)
  metodoPagamento2: z.string().optional(),
  valorPago2: z.number().min(0).optional(),
  // Meias (compra obrigatória no parque)
  meiasQuantidade: z.number().min(0).optional(),
});

type EntradaLivreFormData = z.infer<typeof entradaLivreSchema>;

interface EntradaLivreFormProps {
  entrada?: EntradaLivre | null;
  onClose: () => void;
}

const DURACAO_OPTIONS = [
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
];

// Estado de pagamento — Select de 3 estados para obrigar selecção explícita
const ESTADO_PAGAMENTO_OPTIONS = [
  { value: "", label: "Seleccionar..." },
  { value: "true", label: "Pago" },
  { value: "false", label: "Não pago" },
];

interface ExtraItem {
  id: string;
  nome: string;
  precoUnitario: number;
  subcategoria?: string;
  activo?: boolean;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

/** Agrupa extras por subcategoria */
function groupBySubcategoria(items: ExtraItem[]) {
  const grouped: Record<string, ExtraItem[]> = {};
  const ungrouped: ExtraItem[] = [];
  for (const item of items) {
    const sub = item.subcategoria?.trim();
    if (sub) {
      if (!grouped[sub]) grouped[sub] = [];
      grouped[sub].push(item);
    } else {
      ungrouped.push(item);
    }
  }
  return { grouped, ungrouped };
}

export default function EntradaLivreForm({ entrada, onClose }: EntradaLivreFormProps) {
  const isEdit = !!entrada;
  const criar = useCriarEntradaLivre();
  const atualizar = useAtualizarEntradaLivre();

  const { data: cacifosLivresData } = useCacifos({ estado: "LIVRE" });
  const { data: extras } = useExtras();

  // ── Crianças (managed outside RHF because dynamic array) ──
  const [criancas, setCriancas] = React.useState<Array<{ nome: string; idade: string; querLanche: boolean }>>(
    entrada?.criancas?.map((c) => ({ nome: c.nome, idade: c.idade?.toString() ?? "", querLanche: c.querLanche !== false })) ??
      [{ nome: "", idade: "", querLanche: true }]
  );

  // ── Extras seleccionados (managed outside RHF) ──
  const [selectedExtrasIds, setSelectedExtrasIds] = React.useState<string[]>(
    entrada?.extras?.map((e) => e.extraId) ?? []
  );
  const [showCriancasError, setShowCriancasError] = React.useState(false);
  // Controla se o utilizador editou manualmente o custo (para não sobrescrever)
  const [custoEdited, setCustoEdited] = React.useState(false);
  // Controla a modal de pesquisa de cliente existente
  const [showClienteSearch, setShowClienteSearch] = React.useState(false);
  // Controla a expansão do pagamento dividido
  const [showSplitPayment, setShowSplitPayment] = React.useState(
    !!entrada?.metodoPagamento2 || !!entrada?.valorPago2
  );
  // Modal dedicada de pagamento (com acertos/auditoria) — usada em modo edição
  const [showPagamentoModal, setShowPagamentoModal] = React.useState(false);

  const defaultValues = useMemo<Partial<EntradaLivreFormData>>(
    () => ({
      encarregadoNome: entrada?.encarregadoNome ?? "",
      encarregadoTelefone: entrada?.encarregadoTelefone ?? "",
      encarregadoEmail: entrada?.encarregadoEmail ?? "",
      duracaoMinutos: entrada?.duracaoMinutos ?? 60,
      custoTotal: entrada?.custoTotal,
      metodoPagamento: entrada?.metodoPagamento ?? "",
      // undefined enquanto o utilizador não seleccionar (obrigatório)
      pago: entrada?.pago,
      cacifoId: entrada?.cacifoId ?? "",
      observacoes: entrada?.observacoes ?? "",
      observacoesLesoes: entrada?.observacoesLesoes ?? "",
      temLanche: entrada?.temLanche ?? false,
      horaLanche: (entrada?.horaLanche as string | undefined) ?? "",
      numAdultos: entrada?.numAdultos ?? 0,
      metodoPagamento2: entrada?.metodoPagamento2 ?? "",
      valorPago2: entrada?.valorPago2 ?? 0,
      meiasQuantidade: entrada?.meiasQuantidade ?? 0,
    }),
    [entrada]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EntradaLivreFormData>({
    resolver: zodResolver(entradaLivreSchema),
    defaultValues,
  });

  // ── Derived data ──
  const duracaoMinutos = watch("duracaoMinutos");
  const pago = watch("pago");
  const cacifoIdWatched = watch("cacifoId");

  // Tarifário global (singleton) — usado para auto-preenchimento do custo
  const { data: configPreco } = useConfigPreco();

  // Custo calculado a partir do tarifário global:
  // (precoHora × duração) × nº de pessoas (crianças + adultos).
  // Se temLanche, adiciona o suplemento de lanche por pessoa.
  // Distingue dia de semana vs fim de semana.
  const temLancheWatched = watch("temLanche") ?? false;
  const numAdultosWatched = watch("numAdultos") ?? 0;
  // Custo de tempo por pessoa (escalão 1h/2h + hora adicional)
  const custoTempoPorPessoa = useMemo(() => {
    if (!configPreco) return 0;
    const preco1h = Number(configPreco.precoEntrada1h ?? 6);
    const preco2h = Number(configPreco.precoEntrada2h ?? 10);
    const precoHoraAdicional = Number(configPreco.precoEntradaHoraAdicional ?? 5);
    const dur = duracaoMinutos || 0;
    return dur <= 60 ? preco1h : dur <= 120 ? preco2h : preco2h + Math.ceil((dur - 120) / 60) * precoHoraAdicional;
  }, [configPreco, duracaoMinutos]);

  // Componentes de custo para o resumo detalhado
  const custoComponentes = useMemo(() => {
    const comNome = criancas.filter((c) => c.nome.trim());
    const totalPessoas = Math.max(comNome.length + (numAdultosWatched ?? 0), 1);
    const custoTempo = custoTempoPorPessoa * totalPessoas;
    const precoLanche = Number(configPreco?.precoLancheEntrada ?? 3);
    const criancasComLanche = temLancheWatched ? comNome.filter((c) => c.querLanche).length : 0;
    const custoLanche = precoLanche * criancasComLanche;
    return { totalPessoas, criancasComLanche, custoTempo, custoLanche, total: custoTempo + custoLanche };
  }, [custoTempoPorPessoa, criancas, numAdultosWatched, temLancheWatched, configPreco]);

  // Mantém compatibilidade: custoCalculado = total
  const custoCalculado = custoComponentes.total;

  // Sync do custoTotal quando a duração muda (auto-preenchimento).
  // Respeita edições manuais do utilizador (não sobrescreve se já editou).
  React.useEffect(() => {
    if (custoEdited) return;
    if (custoCalculado > 0) {
      setValue("custoTotal", Number(custoCalculado.toFixed(2)));
    }
  }, [custoCalculado, setValue, custoEdited]);

  const custoTotalWatched = watch("custoTotal");
  const custoFinal = custoTotalWatched ?? custoCalculado;

  const extraItems = useMemo<ExtraItem[]>(
    () =>
      (extras ?? [])
        .filter((e: ExtraItem) => e.activo !== false)
        .map((e) => ({
          id: e.id,
          nome: e.nome,
          precoUnitario: Number(e.precoUnitario),
          subcategoria: e.subcategoria,
        })),
    [extras]
  );

  const extraGroups = useMemo(() => groupBySubcategoria(extraItems), [extraItems]);

  const totalExtras = useMemo(() => {
    let total = 0;
    for (const extraId of selectedExtrasIds) {
      const extra = extraItems.find((e) => e.id === extraId);
      if (extra) total += extra.precoUnitario;
    }
    return total;
  }, [selectedExtrasIds, extraItems]);

  // Lista de cacifos: só LIVRES (da API) + o cacifo actualmente associado
  // (em edição) para que continue visível no dropdown.
  const cacifosLivres = useMemo(() => {
    const livres = Array.isArray(cacifosLivresData)
      ? cacifosLivresData
      : ((cacifosLivresData as unknown as { items?: Array<{ id: string; numero: number; nome?: string; estado: string }> })?.items ?? []);
    const lista: Array<{ id: string; numero: number; nome?: string; estado: string }> = [
      ...(livres as Array<{ id: string; numero: number; nome?: string; estado: string }>),
    ];
    if (entrada?.cacifo && !lista.some((c) => c.id === entrada.cacifo!.id)) {
      lista.push({
        id: entrada.cacifo.id,
        numero: entrada.cacifo.numero,
        nome: entrada.cacifo.nome ?? undefined,
        estado: "OCUPADO",
      });
    }
    return lista;
  }, [cacifosLivresData, entrada?.cacifo]);

  const cacifoOptions = useMemo(
    () => [
      { value: "", label: "Nenhum" },
      ...cacifosLivres.map((c) => ({
        value: c.id,
        label: `#${c.numero}${c.nome ? ` — ${c.nome}` : ""}`,
      })),
    ],
    [cacifosLivres]
  );

  // ── Handlers ──
  const addCrianca = useCallback(() => {
    setCriancas((prev) => [...prev, { nome: "", idade: "", querLanche: true }]);
  }, []);

  const removeCrianca = useCallback((index: number) => {
    setCriancas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCrianca = useCallback((index: number, field: "nome" | "idade", value: string) => {
    setCriancas((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    if (field === "nome" && value.trim()) setShowCriancasError(false);
  }, []);

  const toggleCriancaLanche = useCallback((index: number) => {
    setCriancas((prev) => prev.map((c, i) => (i === index ? { ...c, querLanche: !c.querLanche } : c)));
  }, []);

  const toggleExtra = useCallback((extraId: string) => {
    setSelectedExtrasIds((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  }, []);

  // ── Pesquisa de cliente existente: preenche encarregado + filhos ──
  const handleClienteSelected = useCallback(
    (cliente: Cliente, filhosSelecionados: ClienteFilho[]) => {
      setValue("encarregadoNome", cliente.nome, { shouldDirty: true });
      setValue("encarregadoTelefone", cliente.telefone, { shouldDirty: true });
      if (cliente.email) {
        setValue("encarregadoEmail", cliente.email, { shouldDirty: true });
      }

      // Pré-preenche crianças com os filhos seleccionados (se houver)
      if (filhosSelecionados.length > 0) {
        const novasCriancas = filhosSelecionados.map((filho) => {
          // Calcula idade a partir da data de nascimento
          let idade = "";
          if (filho.dataNascimento) {
            const nasc = new Date(filho.dataNascimento);
            const agora = new Date();
            let anos = agora.getFullYear() - nasc.getFullYear();
            const m = agora.getMonth() - nasc.getMonth();
            if (m < 0 || (m === 0 && agora.getDate() < nasc.getDate())) anos--;
            idade = String(Math.max(0, anos));
          }
          return { nome: filho.nome, idade, querLanche: true };
        });
        setCriancas(novasCriancas);
        setShowCriancasError(false);
      }
    },
    [setValue]
  );

  const [submitError, setSubmitError] = React.useState("");

  const onSubmit = useCallback(
    async (data: EntradaLivreFormData) => {
      // "Crianças" é obrigatório: impedir submissão sem pelo menos um nome.
      if (!criancas.some((c) => c.nome.trim())) {
        setShowCriancasError(true);
        return;
      }
      setShowCriancasError(false);
      setSubmitError("");
      const payload = {
        criancas: criancas
          .filter((c) => c.nome.trim())
          .map((c) => ({
            nome: c.nome.trim(),
            idade: c.idade ? parseInt(c.idade, 10) : undefined,
            querLanche: c.querLanche,
          })),
        encarregadoNome: data.encarregadoNome,
        encarregadoTelefone: data.encarregadoTelefone,
        encarregadoEmail: data.encarregadoEmail || undefined,
        duracaoMinutos: data.duracaoMinutos,
        custoTotal: data.custoTotal,
        // Em edição, o pagamento é gerido na modal dedicada ("Gerir pagamento",
        // com acertos/auditoria): os campos são omitidos (undefined) para não
        // sobrescrever alterações feitas aí.
        metodoPagamento: isEdit ? undefined : (data.metodoPagamento && data.metodoPagamento !== "NONE" ? data.metodoPagamento : undefined),
        pago: isEdit ? undefined : data.pago,
        // null remove o cacifo associado (o serviço liberta o cacifo antigo).
        cacifoId: data.cacifoId || null,
        extrasIds: selectedExtrasIds.length > 0 ? selectedExtrasIds : undefined,
        observacoes: data.observacoes || undefined,
        observacoesLesoes: data.observacoesLesoes || undefined,
        temLanche: data.temLanche,
        horaLanche: data.horaLanche || (isEdit ? null : undefined),
        numAdultos: data.numAdultos,
        metodoPagamento2: isEdit ? undefined : (data.metodoPagamento2 && data.metodoPagamento2 !== "NONE" ? data.metodoPagamento2 : undefined),
        valorPago2: isEdit ? undefined : data.valorPago2 || undefined,
        meiasQuantidade: data.meiasQuantidade || undefined,
      };

      try {
        if (isEdit && entrada) {
          await atualizar.mutateAsync({ id: entrada.id, data: payload });
        } else {
          await criar.mutateAsync(payload);
        }
        onClose();
      } catch (err) {
 
        setSubmitError(
          err instanceof Error && err.message
            ? `Erro ao guardar: ${err.message}`
            : "Erro ao guardar a entrada. Tente novamente."
        );
      }
    },
    [criancas, selectedExtrasIds, isEdit, entrada, atualizar, criar, onClose]
  );

  const onInvalid = useCallback(() => {
    setShowCriancasError(!criancas.some((c) => c.nome.trim()));
    const firstError = document.querySelector("[data-error='true'], .border-accent-red-400");
    if (firstError) firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [criancas]);

  const isLoading = isSubmitting || criar.isPending || atualizar.isPending;

  const renderExtraItem = useCallback(
    (item: ExtraItem) => {
      const isSelected = selectedExtrasIds.includes(item.id);
      return (
        <button
          key={item.id}
          type="button"
          onClick={() => toggleExtra(item.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors cursor-pointer ${
            isSelected ? "border-primary-300 bg-primary-50/50" : "border-border hover:border-gray-300"
          }`}
        >
          <span className="text-sm text-text-primary">{item.nome}</span>
          <span className="text-xs font-medium text-text-secondary">
            +{formatEuro(item.precoUnitario)}
          </span>
        </button>
      );
    },
    [selectedExtrasIds, toggleExtra]
  );

  return (
    <div className="flex flex-col max-h-[70vh]">
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0">
        {/* ── Scrollable Content ── */}
        <div className="flex-1 min-h-0 overflow-hidden overflow-y-auto px-3 space-y-6">
          {/* ── Crianças ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Users size={14} className="text-brand-500" /> Crianças *
              </label>
              <button
                type="button"
                onClick={addCrianca}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <Plus size={13} /> Adicionar criança
              </button>
            </div>
            <div className="space-y-2">
              {criancas.map((crianca, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="flex-1">
                    <InputField
                      value={crianca.nome}
                      onChange={(e) => updateCrianca(index, "nome", e.target.value)}
                      placeholder={`Nome da criança ${index + 1}`}
                      error={showCriancasError && !crianca.nome.trim()}
                    />
                  </div>
                  <div className="w-24">
                    <InputField
                      type="number"
                      value={crianca.idade}
                      onChange={(e) => updateCrianca(index, "idade", e.target.value)}
                      placeholder="Idade"
                      min={0}
                      max={18}
                    />
                  </div>
                  {temLancheWatched && (
                    <div className="pb-2">
                      <Checkbox
                        checked={crianca.querLanche}
                        onChange={() => toggleCriancaLanche(index)}
                        label="Lanche"
                      />
                    </div>
                  )}
                  {criancas.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCrianca(index)}
                      className="p-2 text-text-muted hover:text-accent-red transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {showCriancasError && (
              <p className="text-xs text-error-500">É obrigatório indicar pelo menos uma criança.</p>
            )}
          </div>

          {/* ── Encarregado ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <User size={14} className="text-brand-500" /> Encarregado de Educação *
              </label>
              <button
                type="button"
                onClick={() => setShowClienteSearch(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-brand-500 hover:bg-brand-50 rounded-lg transition-colors"
              >
                <Search size={13} /> Pesquisar Cliente
              </button>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <InputField
                  {...register("encarregadoNome")}
                  placeholder="Nome do responsável"
                  error={!!errors.encarregadoNome}
                  hint={errors.encarregadoNome?.message}
                />
              </div>
              <div className="flex-1">
                <InputField
                  type="tel"
                  {...register("encarregadoTelefone")}
                  placeholder="Telefone"
                  error={!!errors.encarregadoTelefone}
                  hint={errors.encarregadoTelefone?.message}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <InputField
                  type="email"
                  {...register("encarregadoEmail")}
                  placeholder="Email (opcional)"
                  error={!!errors.encarregadoEmail}
                  hint={errors.encarregadoEmail?.message}
                />
              </div>
            </div>
          </div>

          {/* ── Duração e Custo ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Clock size={14} className="text-brand-500" /> Duração e Custo
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Duração *
                </label>
                <Select
                  options={DURACAO_OPTIONS}
                  placeholder="Seleccionar"
                  value={String(duracaoMinutos)}
                  onChange={(val) => setValue("duracaoMinutos", Number(val))}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Custo total (€) — editável
                </label>
                <div className="flex items-center gap-2">
                  <InputField
                    type="number"
                    step={0.01}
                    min={0}
                    placeholder="0.00"
                    value={
                      custoTotalWatched != null
                        ? String(custoTotalWatched)
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustoEdited(true);
                      setValue(
                        "custoTotal",
                        v === "" ? undefined : Number(v),
                        { shouldDirty: true }
                      );
                    }}
                  />
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    ≈ {formatEuro(custoCalculado)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Lanche e Acompanhantes ── */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Users size={14} className="text-brand-500" /> Lanche e Acompanhantes
            </label>
            {/* Lanche toggle */}
            <div className="flex items-center justify-between py-1">
              <div>
                <span className="text-sm font-medium text-text-primary">Inclui lanche?</span>
                <p className="text-xs text-text-muted">
                  +{formatEuro(Number(configPreco?.precoLancheEntrada ?? 3))} por criança (marcar por criança acima)
                </p>
              </div>
              <Switch
                checked={watch("temLanche") ?? false}
                onChange={(checked: boolean) => setValue("temLanche", checked)}
              />
            </div>
            {/* Hora do lanche (visível apenas se temLanche) */}
            {(watch("temLanche") ?? false) && (
              <div className="w-40">
                <label className="block text-xs font-medium text-text-secondary mb-1">Hora do lanche</label>
                <InputField
                  type="time"
                  {...register("horaLanche")}
                />
              </div>
            )}
            {/* Adulto acompanhante */}
            <div className="flex items-center justify-between py-1">
              <div>
                <Checkbox
                  checked={(watch("numAdultos") ?? 0) > 0}
                  onChange={(checked) => setValue("numAdultos", checked ? 1 : 0, { shouldDirty: true })}
                  label="Adulto acompanha e paga entrada"
                />
                {custoTempoPorPessoa > 0 && (
                  <p className="text-xs text-text-muted ml-8">
                    +{formatEuro(custoTempoPorPessoa)} por adulto
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Cacifo ── */}
          {cacifoOptions.length > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <Package size={14} className="text-brand-500" /> Cacifo (opcional)
              </label>
              <Select
                options={cacifoOptions}
                placeholder="Seleccionar cacifo"
                value={cacifoIdWatched ?? ""}
                onChange={(val) => setValue("cacifoId", val)}
              />
            </div>
          )}

          {/* ── Extras (desactivado temporariamente) ── */}
          {/* {extraItems.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-text-primary block">
                ✨ Extras (opcional)
              </label>
              <div className="space-y-3">
                {Object.entries(extraGroups.grouped).map(([sub, items]) => (
                  <div key={sub}>
                    <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                      {sub}
                    </p>
                    <div className="flex flex-wrap gap-3">{items.map(renderExtraItem)}</div>
                  </div>
                ))}
                {extraGroups.ungrouped.length > 0 && (
                  <div>
                    {Object.keys(extraGroups.grouped).length > 0 && (
                      <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1.5">
                        Outros
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {extraGroups.ungrouped.map(renderExtraItem)}
                    </div>
                  </div>
                )}
              </div>
              {totalExtras > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary-50 border border-primary-200">
                  <span className="text-sm font-medium text-text-secondary">Total Extras</span>
                  <span className="text-lg font-bold text-primary-500">
                    {formatEuro(totalExtras / 100)}
                  </span>
                </div>
              )}
            </div>
          )} */}

          {/* ── Observações ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <MessageSquare size={14} className="text-brand-500" /> Observações
            </label>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Observações gerais
              </label>
              <TextArea
                placeholder="Notas gerais..."
                value={watch("observacoes") ?? ""}
                onChange={(v) => setValue("observacoes", v)}
                rows={2}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Lesões / Alergias
              </label>
              <TextArea
                placeholder="Alergias, lesões..."
                value={watch("observacoesLesoes") ?? ""}
                onChange={(v) => setValue("observacoesLesoes", v)}
                rows={2}
              />
            </div>
          </div>

          {/* ── Pagamento ── */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <CreditCard size={14} className="text-brand-500" /> Pagamento
            </div>

            {/* Estado + Método — na criação, campos; na edição, resumo + "Gerir pagamento" */}
            {isEdit && entrada ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface border border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  {entrada.pago ? (
                    <CheckCircle2 size={18} className="text-accent-green-500 shrink-0" />
                  ) : (
                    <Wallet size={18} className="text-accent-orange-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {entrada.pago ? "Pago" : "Por pagar"}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {METODO_PAGAMENTO_OPTIONS.find((o) => o.value === entrada.metodoPagamento)?.label ?? "Método não definido"}
                      {entrada.metodoPagamento2
                        ? ` + ${METODO_PAGAMENTO_OPTIONS.find((o) => o.value === entrada.metodoPagamento2)?.label ?? ""}`
                        : ""}
                      {" · "}
                      {formatEuro(Number(entrada.custoTotalFinal ?? entrada.custoTotal ?? 0))}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="outline" onClick={() => setShowPagamentoModal(true)} className="shrink-0">
                  <Wallet size={14} /> Gerir pagamento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Estado do pagamento *
                  </label>
                  <Select
                    options={ESTADO_PAGAMENTO_OPTIONS}
                    placeholder="Seleccionar..."
                    value={pago === undefined ? "" : pago ? "true" : "false"}
                    onChange={(val) => setValue("pago", val === "true", { shouldValidate: true, shouldDirty: true })}
                  />
                  {errors.pago && (
                    <p className="text-xs text-error-500 mt-1">{errors.pago.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Método de pagamento
                  </label>
                  <Select
                    options={METODO_PAGAMENTO_OPTIONS}
                    placeholder="Seleccionar método"
                    value={watch("metodoPagamento") ?? "NONE"}
                    onChange={(val) => setValue("metodoPagamento", val === "NONE" ? undefined : val)}
                  />
                </div>
              </div>
            )}

            {/* Meias com stepper */}
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">Meias</span>
                <span className="text-xs text-text-muted">
                  {formatEuro(Number(configPreco?.precoMeias ?? 1.5))} / par
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setValue("meiasQuantidade", Math.max(0, (watch("meiasQuantidade") ?? 0) - 1), { shouldDirty: true })}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary"
                  >
                    −
                  </button>
                  <span className="w-10 text-center text-sm font-medium text-text-primary">
                    {watch("meiasQuantidade") ?? 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => setValue("meiasQuantidade", (watch("meiasQuantidade") ?? 0) + 1, { shouldDirty: true })}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-text-muted">Cobradas automaticamente na conclusão</p>
              </div>
            </div>

            {/* Pagamento dividido (apenas na criação — na edição usar "Gerir pagamento") */}
            {!isEdit && (
              <div className="border-t border-border pt-3 space-y-2">
                <Checkbox
                  checked={showSplitPayment}
                  onChange={(checked) => {
                    setShowSplitPayment(checked);
                    if (!checked) {
                      setValue("metodoPagamento2", undefined, { shouldDirty: true });
                      setValue("valorPago2", 0, { shouldDirty: true });
                    }
                  }}
                  label="Dividir pagamento (2º método)"
                />
                {showSplitPayment && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">2º Método</label>
                      <Select
                        options={METODO_PAGAMENTO_OPTIONS}
                        placeholder="2º método"
                        value={watch("metodoPagamento2") ?? "NONE"}
                        onChange={(val) => setValue("metodoPagamento2", val === "NONE" ? undefined : val)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Valor 2º Método (€)</label>
                      <InputField type="number" step={0.01} min={0} value={watch("valorPago2") ?? 0} onChange={(e) => setValue("valorPago2", e.target.value === "" ? 0 : parseFloat(e.target.value))} placeholder="0,00" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Resumo detalhado de valores */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  Tempo ({DURACAO_OPTIONS.find((o) => o.value === String(duracaoMinutos))?.label ?? `${duracaoMinutos}min`} × {custoComponentes.totalPessoas}p)
                </span>
                <span className="text-xs text-text-secondary">{formatEuro(custoComponentes.custoTempo)}</span>
              </div>
              {custoComponentes.custoLanche > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    Lanche ({custoComponentes.criancasComLanche} {custoComponentes.criancasComLanche === 1 ? "criança" : "crianças"})
                  </span>
                  <span className="text-xs text-text-secondary">{formatEuro(custoComponentes.custoLanche)}</span>
                </div>
              )}
              {totalExtras > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Extras</span>
                  <span className="text-xs text-text-secondary">{formatEuro(totalExtras / 100)}</span>
                </div>
              )}
              {(watch("meiasQuantidade") ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">
                    Meias ({watch("meiasQuantidade")} {(watch("meiasQuantidade") ?? 0) === 1 ? "par" : "pares"})
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatEuro((watch("meiasQuantidade") ?? 0) * Number(configPreco?.precoMeias ?? 1.5))}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
                <span className="text-sm font-semibold text-text-primary">Total</span>
                <span className="text-base font-bold text-primary-500">
                  {formatEuro(custoFinal + totalExtras / 100)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer (fixed) ── */}
        <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end shrink-0">
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "A guardar..."
              : isEdit
                ? "Guardar Alterações"
                : "Criar Entrada"}
          </Button>
        </div>
        {submitError && (
          <p className="text-sm text-error-500 text-right lg:pr-2">{submitError}</p>
        )}
      </form>

      {/* ── Modal: Pesquisar cliente existente ── */}
      <ClienteSearchModal
        isOpen={showClienteSearch}
        onClose={() => setShowClienteSearch(false)}
        onSelect={handleClienteSelected}
      />

      {/* ── Modal: Gerir pagamento (edição) ── */}
      {showPagamentoModal && entrada && (
        <EntradaLivrePagamentoModal entrada={entrada} onClose={() => setShowPagamentoModal(false)} />
      )}
    </div>
  );
}
