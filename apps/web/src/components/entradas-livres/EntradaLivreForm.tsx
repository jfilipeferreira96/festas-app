"use client";

import React, { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, CreditCard, User, Users, MapPin,
  Clock, Package, MessageSquare, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { Select } from "@/components/ui/select";
import Switch from "@/components/form/switch/Switch";
import {
  useCriarEntradaLivre,
  useAtualizarEntradaLivre,
  useCheckOcupacaoLocal,
} from "@/hooks/use-entrada-livre";
import { useLocais } from "@/hooks/use-locais";
import { useCacifos } from "@/hooks/use-cacifos";
import { useExtras } from "@/hooks/use-extras";
import { useConfigPreco } from "@/hooks/use-precos";
import type { EntradaLivre } from "@/lib/api/entradaLivre";

// ── Zod Schema ─────────────────────────────────────────────────
const entradaLivreSchema = z.object({
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoTelefone: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  localId: z.string().min(1, "Seleccione um local"),
  duracaoMinutos: z.number().min(30, "Duração mínima é 30 minutos"),
  custoTotal: z.number().min(0, "O custo não pode ser negativo").optional(),
  metodoPagamento: z.string().optional(),
  pago: z.boolean().optional(),
  cacifoId: z.string().optional(),
  observacoes: z.string().optional(),
  observacoesLesoes: z.string().optional(),
});

type EntradaLivreFormData = z.infer<typeof entradaLivreSchema>;

interface EntradaLivreFormProps {
  entrada?: EntradaLivre | null;
  onClose: () => void;
}

const DURACAO_OPTIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1h 30min" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
];

const METODO_PAGAMENTO_OPTIONS = [
  { value: "NONE", label: "Não definido" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "MULTIBANCO", label: "Multibanco" },
  { value: "MBWAY", label: "MB WAY" },
  { value: "TRANSFERENCIA", label: "Transferência" },
  { value: "CARTAO", label: "Cartão" },
  { value: "OUTRO", label: "Outro" },
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

  const { data: locais } = useLocais();
  // ── Cacifos: usa filtro server-side para só trazer cacifos LIVRE.
  // Em modo edição, o cacifo actualmente associado vem do objeto `entrada`
  // (porque está OCUPADO e não apareceria na query de LIVRE).
  const { data: cacifosLivresData } = useCacifos({ estado: "LIVRE" });
  const { data: extras } = useExtras();

  // ── Crianças (managed outside RHF because dynamic array) ──
  const [criancas, setCriancas] = React.useState<Array<{ nome: string; idade: string }>>(
    entrada?.criancas?.map((c) => ({ nome: c.nome, idade: c.idade?.toString() ?? "" })) ??
      [{ nome: "", idade: "" }]
  );

  // ── Extras seleccionados (managed outside RHF) ──
  const [selectedExtrasIds, setSelectedExtrasIds] = React.useState<string[]>(
    entrada?.extras?.map((e) => e.extraId) ?? []
  );
  const [showCriancasError, setShowCriancasError] = React.useState(false);
  // Controla se o utilizador editou manualmente o custo (para não sobrescrever)
  const [custoEdited, setCustoEdited] = React.useState(false);

  const defaultValues = useMemo<EntradaLivreFormData>(
    () => ({
      encarregadoNome: entrada?.encarregadoNome ?? "",
      encarregadoTelefone: entrada?.encarregadoTelefone ?? "",
      encarregadoEmail: entrada?.encarregadoEmail ?? "",
      localId: entrada?.localId ?? "",
      duracaoMinutos: entrada?.duracaoMinutos ?? 60,
      custoTotal: entrada?.custoTotal,
      metodoPagamento: entrada?.metodoPagamento ?? "",
      pago: entrada?.pago ?? false,
      cacifoId: entrada?.cacifoId ?? "",
      observacoes: entrada?.observacoes ?? "",
      observacoesLesoes: entrada?.observacoesLesoes ?? "",
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
  const localId = watch("localId");
  const duracaoMinutos = watch("duracaoMinutos");
  const pago = watch("pago") ?? false;
  const cacifoIdWatched = watch("cacifoId");

  // Tarifário global (singleton) — usado para auto-preenchimento do custo
  const { data: configPreco } = useConfigPreco();

  // Capacidade do local agora (warn-only) — conta as crianças do formulário
  const numCriancasForm = criancas.filter((c) => c.nome.trim()).length;
  const ocupacao = useCheckOcupacaoLocal(localId || undefined, numCriancasForm, entrada?.id);

  // Custo calculado a partir do tarifário global (precoHora * duração).
  // Distingue dia de semana vs fim de semana.
  const custoCalculado = useMemo(() => {
    if (!configPreco) return 0;
    const hoje = new Date();
    const dia = hoje.getDay();
    const isFimSemana = dia === 0 || dia === 6;
    const precoHora = isFimSemana
      ? Number(configPreco.precoEntradaHoraFimSemana)
      : Number(configPreco.precoEntradaHoraSemana);
    return (precoHora / 60) * (duracaoMinutos || 0);
  }, [configPreco, duracaoMinutos]);

  // Sync do custoTotal quando o local/duração mudem (auto-preenchimento).
  // Respeita edições manuais do utilizador (não sobrescreve se já editou).
  React.useEffect(() => {
    if (custoEdited) return;
    if (custoCalculado > 0) {
      setValue("custoTotal", Number(custoCalculado.toFixed(2)));
    }
  }, [custoCalculado, setValue, custoEdited]);

  // Reset do flag de edição quando o local muda (configuração diferente)
  React.useEffect(() => {
    setCustoEdited(false);
  }, [localId]);

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

  const localOptions = useMemo(
    () => [
      { value: "", label: "Seleccionar local" },
      ...(locais ?? []).map((l) => ({ value: l.id, label: l.nome })),
    ],
    [locais]
  );

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
    setCriancas((prev) => [...prev, { nome: "", idade: "" }]);
  }, []);

  const removeCrianca = useCallback((index: number) => {
    setCriancas((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateCrianca = useCallback((index: number, field: "nome" | "idade", value: string) => {
    setCriancas((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
    if (field === "nome" && value.trim()) setShowCriancasError(false);
  }, []);

  const toggleExtra = useCallback((extraId: string) => {
    setSelectedExtrasIds((prev) =>
      prev.includes(extraId) ? prev.filter((id) => id !== extraId) : [...prev, extraId]
    );
  }, []);

  const onSubmit = useCallback(
    async (data: EntradaLivreFormData) => {
      // "Crianças" é obrigatório: impedir submissão sem pelo menos um nome.
      if (!criancas.some((c) => c.nome.trim())) {
        setShowCriancasError(true);
        return;
      }
      setShowCriancasError(false);
      const payload = {
        criancas: criancas
          .filter((c) => c.nome.trim())
          .map((c) => ({
            nome: c.nome.trim(),
            idade: c.idade ? parseInt(c.idade, 10) : undefined,
          })),
        encarregadoNome: data.encarregadoNome,
        encarregadoTelefone: data.encarregadoTelefone,
        encarregadoEmail: data.encarregadoEmail || undefined,
        localId: data.localId,
        duracaoMinutos: data.duracaoMinutos,
        custoTotal: data.custoTotal,
        metodoPagamento: data.metodoPagamento && data.metodoPagamento !== "NONE" ? data.metodoPagamento : undefined,
        pago: data.pago,
        cacifoId: data.cacifoId || undefined,
        extrasIds: selectedExtrasIds.length > 0 ? selectedExtrasIds : undefined,
        observacoes: data.observacoes || undefined,
        observacoesLesoes: data.observacoesLesoes || undefined,
      };

      if (isEdit && entrada) {
        await atualizar.mutateAsync({ id: entrada.id, data: payload });
      } else {
        await criar.mutateAsync(payload);
      }
      onClose();
    },
    [criancas, selectedExtrasIds, isEdit, entrada, atualizar, criar, onClose]
  );

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
            +{formatEuro(item.precoUnitario / 100)}
          </span>
        </button>
      );
    },
    [selectedExtrasIds, toggleExtra]
  );

  return (
    <div className="flex flex-col max-h-[70vh]">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
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
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <User size={14} className="text-brand-500" /> Encarregado de Educação *
            </label>
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

          {/* ── Configuração (Local · Duração) ── */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <MapPin size={14} className="text-brand-500" /> Configuração
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Local *
                </label>
                <Select
                  options={localOptions}
                  placeholder="Seleccionar local"
                  value={localId}
                  onChange={(val) => setValue("localId", val)}
                />
                {errors.localId && (
                  <p className="mt-1 text-xs text-error-500">{errors.localId.message}</p>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-text-secondary mb-1 flex items-center gap-1">
                  <Clock size={12} /> Duração *
                </label>
                <Select
                  options={DURACAO_OPTIONS}
                  placeholder="Seleccionar"
                  value={String(duracaoMinutos)}
                  onChange={(val) => setValue("duracaoMinutos", Number(val))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-text-secondary">
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

          {/* ── Aviso de capacidade do local (warn-only) ── */}
          {localId && ocupacao.data && (
            <div>
              {ocupacao.data.excedeCapacidade ? (
                <div className="rounded-lg bg-accent-orange-50 border border-accent-orange-200 p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-accent-orange-700 text-xs font-semibold">
                    <AlertTriangle size={14} /> Capacidade do local excedida
                  </div>
                  <p className="text-xs text-accent-orange-700 pl-5">
                    {ocupacao.data.ocupacaoAtual} na sala + {ocupacao.data.novasCriancas} novas ={" "}
                    <strong>{ocupacao.data.totalPrevisto}</strong> crianças
                    (capacidade máx. {ocupacao.data.capacidade}).
                  </p>
                  <p className="text-[11px] text-accent-orange-600 pl-5">
                    Pode continuar mesmo assim (aviso apenas).
                  </p>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success-50 border border-success-200 text-success-700 text-xs font-medium">
                  <CheckCircle2 size={14} /> Dentro da capacidade — {ocupacao.data.totalPrevisto}/
                  {ocupacao.data.capacidade} crianças
                </span>
              )}
            </div>
          )}

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

          {/* ── Pagamento (cartão de resumo) ── */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <CreditCard size={14} className="text-brand-500" /> Pagamento
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Método
                </label>
                <Select
                  options={METODO_PAGAMENTO_OPTIONS}
                  placeholder="Método"
                  value={watch("metodoPagamento") ?? "NONE"}
                  onChange={(val) => setValue("metodoPagamento", val === "NONE" ? undefined : val)}
                />
              </div>
              <div className="flex items-end justify-end pb-1">
                <Switch
                  checked={pago}
                  onChange={(checked) => setValue("pago", checked)}
                  label={pago ? "Pago" : "Não pago"}
                />
              </div>
            </div>
            {/* ── Resumo de valores ── */}
            <div className="border-t border-border pt-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Custo base</span>
                <span className="text-xs text-text-secondary">{formatEuro(custoFinal)}</span>
              </div>
              {totalExtras > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Extras</span>
                  <span className="text-xs text-text-secondary">{formatEuro(totalExtras / 100)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-semibold text-text-primary">Total a pagar</span>
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
      </form>
    </div>
  );
}