import { z } from "zod";
import type { CreateReservaData, Reserva } from "@/lib/api/reservas";
import type { ModoConvite } from "@saas/shared-types";
import { FESTA_COLORS } from "@/components/ui/FestaColorPicker";
import { calcIdade, isFimDeSemana, toISODate } from "@/lib/format";
import { BOLOS_NOSSOS } from "@/lib/constants/bolo";
import { DATA_NASCIMENTO_DEFAULT } from "@/components/entradas-livres/form/entrada-livre-form.schema";

/** Data de nascimento por omissão - mesma fonte do form de Entradas Livres. */
export { DATA_NASCIMENTO_DEFAULT };

export interface FestaFormInitialValues {
  data?: string;
  horario?: string;
  duracaoMinutos?: number;
  horaLanche?: string;
  cor?: string;
  salaLancheId?: string;
}

const aniversarianteSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  dataNascimento: z.string().min(1, "Data de nascimento obrigatória"),
});

const encarregadoAdicionalSchema = z.object({
  nome: z.string(),
  contacto: z.string(),
  email: z.string(),
  codigoPostal: z.string(),
});

const METODOS_PAGAMENTO = ["DINHEIRO", "MULTIBANCO", "MBWAY", "TRANSFERENCIA", "CARTAO", "OUTRO"] as const;
// Lista completa de tipos: chaves fixas + bolos da casa (fonte única)
const TIPOS_BOLO = ["PAIS_TRAZEM", "A_DECIDIR", ...BOLOS_NOSSOS] as const;
const CAUCOES = ["NAO_PAGA", "PAGA", "PAGA_NO_DIA"] as const;
// Convites com múltiplos aniversariantes: escolha dos pais
const MODOS_CONVITE = ["JUNTO", "SEPARADO"] as const;

/** Número opcional tolerante: "" / NaN (valueAsNumber em input vazio) → undefined. */
const numeroOpcional = (min = 0) => z.number().min(min).optional().catch(undefined);

export const festaFormSchema = z.object({
  aniversariantes: z.array(aniversarianteSchema).min(1, "Indique pelo menos um aniversariante"),
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoContacto: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  encarregadoCodigoPostal: z.string(),
  adicionarCliente: z.boolean(),
  /** Enviar email de confirmação ao cliente (criação; backend respeita optOut). */
  enviarEmail: z.boolean(),
  encarregadosAdicionais: z.array(encarregadoAdicionalSchema),
  data: z.string().min(1, "Data é obrigatória"),
  horario: z.string().min(1, "Horário é obrigatório"),
  horaLanche: z.string(),
  duracaoMinutos: z.number().min(30, "Duração mínima é 30 minutos"),
  salaLancheId: z.string(),
  cor: z.string(),
  menuId: z.string(),
  // Opcional: com o catálogo de bolos (extras), um bolo sem "tipo interno"
  // não deriva valor para a cozinha - e não selecionar bolo também é válido.
  bolo: z.enum(TIPOS_BOLO).optional(),
  boloTema: z.string(),
  // Inputs numéricos vazios chegam como NaN (valueAsNumber) → normalizar para undefined
  boloQuantidade: numeroOpcional(0),
  numAdultos: numeroOpcional(0),
  previsaoCriancas: z
    .number({ message: "Indique o nº de crianças previstas" })
    .min(1, "Mínimo 1 criança")
    .max(100, "Máximo 100 crianças"),
  numCriancasConfirmadas: numeroOpcional(0),
  /** Total de crianças da festa (gravado em Reserva.numCriancas). */
  numCriancasTotal: numeroOpcional(0),
  /** Convite(s): JUNTO (um com todos os nomes) ou SEPARADO (um por criança). */
  modoConvite: z.enum(MODOS_CONVITE),
  extrasIds: z.array(z.string()),
  extrasTexto: z.record(z.string(), z.string()),
  extrasQuantidades: z.record(z.string(), z.number()),
  tema: z.string(),
  monitoresIds: z.array(z.string()).optional(),
  etapasIds: z.array(z.string()).optional(),
  notasCacifos: z.string(),
  notasLanche: z.string(),
  observacoesGerais: z.string(),
  observacoesLesoes: z.string(),
  observacoesBrindes: z.string(),
  outrosExtras: z.string(),
  // Pagamento (ledger): Total a pagar (editável) + lista de pagamentos realizados
  totalAPagar: z.number().min(0, "O total não pode ser negativo").optional(),
  pagamentos: z
    .array(
      z.object({
        id: z.string(),
        valor: z.number().min(0),
        metodo: z.enum(METODOS_PAGAMENTO),
        referencia: z.string().nullish(),
        nota: z.string().nullish(),
        createdAt: z.string(),
      })
    )
    .optional(),
  /** Acertos iniciais (criação): gravados após criar a festa, com auditoria. */
  ajustes: z.array(
    z.object({
      tipo: z.enum(["ACRESCIMO", "DESCONTO"]),
      valor: z.number().positive("Valor tem de ser maior que zero"),
      motivo: z.string().min(1, "Motivo obrigatório"),
      metodoPagamento: z.string().optional(),
    })
  ).optional(),
  pago: z.boolean().optional(),
  caucao: z.enum(CAUCOES).optional(),
  valorCaucao: numeroOpcional(0),
  metodoCaucao: z.string().optional(),
});

export type FestaFormData = z.infer<typeof festaFormSchema>;

export type FestaFormMetodoPagamento = (typeof METODOS_PAGAMENTO)[number];
export type FestaFormTipoBolo = (typeof TIPOS_BOLO)[number];
export type FestaFormCaucao = (typeof CAUCOES)[number];

export const DURACAO_FESTA_OPTIONS = [
  { value: "60", label: "1h" },
  { value: "90", label: "1h30" },
  { value: "120", label: "2h" },
  { value: "150", label: "2h30" },
  { value: "180", label: "3h" },
];

export const TIPO_BOLO_OPTIONS = [
  { value: "", label: "Seleccionar..." },
  { value: "PAIS_TRAZEM", label: "Pais trazem o bolo" },
  { value: "A_DECIDIR", label: "Ainda vão decidir" },
  { value: "NOSSO_1KG", label: "Nosso bolo 1kg" },
  { value: "NOSSO_2KG", label: "Nosso bolo 2kg" },
  { value: "BOLO_ARTISTICO", label: "Bolo artístico" },
];

export const CAUCAO_OPTIONS: { value: FestaFormCaucao; label: string }[] = [
  { value: "NAO_PAGA", label: "Não paga" },
  { value: "PAGA", label: "Paga" },
  { value: "PAGA_NO_DIA", label: "Paga no dia" },
];

export const MODO_CONVITE_OPTIONS: { value: ModoConvite; label: string }[] = [
  { value: "JUNTO", label: "Junto - um convite com todos os nomes" },
  { value: "SEPARADO", label: "Separado - um convite por criança" },
];

export const CORES_PREDEFINIDAS = FESTA_COLORS.map((c) => ({ value: c.value, label: c.name }));

export const BOLO_BLOQUEIA_TEMA: readonly string[] = ["PAIS_TRAZEM", "A_DECIDIR"];

export function buildFestaDefaults(
  reserva: Reserva | null | undefined,
  initialValues?: FestaFormInitialValues
): FestaFormData {
  const aniversariantes = reserva?.aniversariantes?.length
    ? reserva.aniversariantes.map((a) => ({
        nome: a.aniversariante.nome,
        dataNascimento: a.aniversariante.dataNascimento
          ? a.aniversariante.dataNascimento.split("T")[0]
          : DATA_NASCIMENTO_DEFAULT,
      }))
    : [{ nome: "", dataNascimento: DATA_NASCIMENTO_DEFAULT }];

  return {
    aniversariantes,
    encarregadoNome: reserva?.cliente?.nome ?? "",
    encarregadoContacto: reserva?.cliente?.telefone ?? "",
    encarregadoEmail: reserva?.cliente?.email ?? "",
    encarregadoCodigoPostal: reserva?.cliente?.codigoPostal ?? "",
    adicionarCliente: true,
    enviarEmail: true,
    encarregadosAdicionais: [],
    data: reserva?.data ? toISODate(reserva.data) : (initialValues?.data ?? ""),
    horario: reserva?.horario ?? initialValues?.horario ?? "",
    horaLanche: reserva?.horaLanche ?? initialValues?.horaLanche ?? "",
    duracaoMinutos: reserva?.duracaoMinutos ?? initialValues?.duracaoMinutos ?? 120,
    salaLancheId: reserva?.salaLancheId ?? initialValues?.salaLancheId ?? "",
    cor: reserva?.cor ?? initialValues?.cor ?? "",
    menuId: "",
    bolo: (reserva?.bolo || undefined) as FestaFormData["bolo"],
    boloTema: reserva?.boloTema ?? "",
    boloQuantidade: reserva?.boloQuantidade ?? undefined,
    previsaoCriancas: reserva?.numCriancas ?? reserva?.previsaoCriancas ?? 10,
    numAdultos: reserva?.numAdultos ?? undefined,
    numCriancasConfirmadas: reserva?.numCriancasConfirmadas ?? undefined,
    numCriancasTotal: reserva?.numCriancas ?? undefined,
    modoConvite: (reserva?.modoConvite as ModoConvite | null) ?? "JUNTO",
    extrasIds: reserva?.extras?.map((e) => e.extra.id) ?? [],
    extrasTexto: Object.fromEntries(
      (reserva?.extras ?? []).map((e) => [e.extra.id, e.textoPersonalizado ?? ""])
    ),
    extrasQuantidades: Object.fromEntries(
      (reserva?.extras ?? []).map((e) => [e.extra.id, e.quantidade ?? 1])
    ),
    tema: reserva?.tema ?? "",
    monitoresIds: reserva?.monitores?.map((m) => m.monitor.id) ?? [],
    etapasIds: reserva?.etapas?.map((e) => e.etapa.id) ?? [],
    notasCacifos: reserva?.notasCacifos ?? "",
    notasLanche: reserva?.notasLanche ?? "",
    observacoesGerais: reserva?.observacoesGerais ?? "",
    observacoesLesoes: reserva?.observacoesLesoes ?? "",
    observacoesBrindes: reserva?.observacoesBrindes ?? "",
    outrosExtras: reserva?.outrosExtras ?? "",
    // Pagamento (ledger): total acordado + pagamentos já registados
    totalAPagar: reserva ? Number(reserva.valorTotal ?? 0) || undefined : undefined,
    pagamentos: reserva?.pagamentos?.map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo,
      nota: p.nota ?? undefined,
      createdAt: p.createdAt,
    })),
    ajustes: [],
    pago: reserva?.pago ?? false,
    caucao: (reserva?.caucao || undefined) as FestaFormData["caucao"],
    valorCaucao: reserva?.valorCaucao ? Number(reserva.valorCaucao) : undefined,
    metodoCaucao: reserva?.metodoCaucao ?? undefined,
  };
}

export function buildFestaPayload(
  data: FestaFormData,
  opts: { isEdit: boolean; reservaTemMenu: boolean; menuExtrasCarregados: boolean }
): CreateReservaData {
  const primeiro = data.aniversariantes[0];
  const idadeAnos = calcIdade(primeiro?.dataNascimento ?? "", data.data || toISODate(new Date()));

  const adicionaisTexto = data.encarregadosAdicionais
    .filter((e) => e.nome.trim())
    .map((e, i) => {
      const partes = [`Encarregado ${i + 2}: ${e.nome}`, e.contacto, e.email, e.codigoPostal].filter(Boolean);
      return partes.join(" · ");
    })
    .join("\n");
  const notas = [data.observacoesGerais, adicionaisTexto].filter(Boolean).join("\n\n");

  const menuId = opts.isEdit
    ? opts.reservaTemMenu && !opts.menuExtrasCarregados
      ? undefined
      : data.menuId === "NONE"
        ? null
        : data.menuId || undefined
    : data.menuId === "NONE"
      ? undefined
      : data.menuId || undefined;

  return {
    aniversarianteNome: primeiro?.nome ?? "",
    idadeAnos,
    aniversariantes: data.aniversariantes.map((a) => ({
      nome: a.nome.trim(),
      dataNascimento: a.dataNascimento || undefined,
    })),
    clienteNome: data.encarregadoNome,
    clienteContacto: data.encarregadoContacto,
    clienteEmail: data.encarregadoEmail,
    clienteCodigoPostal: data.encarregadoCodigoPostal || undefined,
    adicionarCliente: data.adicionarCliente,
    enviarEmail: opts.isEdit ? undefined : data.enviarEmail,
    data: data.data,
    horario: data.horario,
    horaLanche: data.horaLanche || undefined,
    duracaoMinutos: data.duracaoMinutos,
    salaLancheId: data.salaLancheId || undefined,
    numCriancas: data.numCriancasTotal ?? data.previsaoCriancas,
    numCriancasConfirmadas: data.numCriancasConfirmadas || undefined,
    modoConvite:
      data.aniversariantes.length > 1 ? data.modoConvite : "JUNTO",
    extrasIds: opts.isEdit || data.extrasIds.length > 0 ? data.extrasIds : undefined,
    extrasTexto: Object.fromEntries(Object.entries(data.extrasTexto).filter(([, v]) => v.trim())),
    extrasQuantidades:
      data.extrasIds.length > 0
        ? Object.fromEntries(data.extrasIds.map((id) => [id, data.extrasQuantidades[id] ?? 1]))
        : undefined,
    monitoresIds: data.monitoresIds,
    etapasIds: data.etapasIds,
    cor: data.cor || undefined,
    menuId,
    bolo: data.bolo || undefined,
    boloTema: data.boloTema || undefined,
    boloQuantidade: data.boloQuantidade || undefined,
    numAdultos: data.numAdultos ?? undefined,
    tema: data.tema || undefined,
    notas,
    notasCacifos: data.notasCacifos || undefined,
    notasLanche: data.notasLanche || undefined,
    observacoesGerais: data.observacoesGerais || undefined,
    observacoesLesoes: data.observacoesLesoes || undefined,
    observacoesBrindes: data.observacoesBrindes || undefined,
    outrosExtras: data.outrosExtras || undefined,
    valorTotal: opts.isEdit ? undefined : data.totalAPagar || undefined,
    pagamentos: opts.isEdit ? undefined : data.pagamentos,
    // Acertos iniciais: o backend grava-os após criar (write-through + auditoria)
    ajustes: opts.isEdit ? undefined : (data.ajustes ?? []).length > 0 ? data.ajustes : undefined,
    pago: opts.isEdit ? undefined : data.pago,
    caucao: opts.isEdit ? undefined : data.caucao,
    valorCaucao: opts.isEdit ? undefined : data.valorCaucao || undefined,
    metodoCaucao: opts.isEdit ? undefined : data.metodoCaucao || undefined,
  };
}

export interface EstimativaFestaInfo {
  estimativa: number;
  precoCrianca: number;
  criancasFaturadas: number;
  minimoAplicavel: number;
}

interface EstimativaConfig {
  precoCriancaSemana: number;
  precoCriancaFimSemana: number;
  precoAdulto?: number;
  minimosCriancasPorAniversariante?: { aniversariantes: number; minimo: number }[] | null;
}

/**
 * Estimativa do total da festa: preço por criança × nº de crianças faturadas
 * (respeitando o mínimo aplicável por nº de aniversariantes) + adultos
 * acompanhantes × preço de adulto (ConfiguracaoPreco.precoAdulto).
 * `precoCriancaOverride` (preço do menu selecionado) sobrepõe o tarifário da
 * data quando definido e positivo - o menu define o preço por criança.
 */
export function calcularEstimativaFesta(
  config: EstimativaConfig | null | undefined,
  dataFesta: string | undefined,
  previsaoCriancas: number | undefined,
  numAniversariantes: number,
  numAdultos = 0,
  precoCriancaOverride?: number
): EstimativaFestaInfo {
  if (!config || !dataFesta) {
    return { estimativa: 0, precoCrianca: 0, criancasFaturadas: 0, minimoAplicavel: 0 };
  }
  const precoTarifario = isFimDeSemana(dataFesta)
    ? Number(config.precoCriancaFimSemana)
    : Number(config.precoCriancaSemana);
  const precoCrianca =
    precoCriancaOverride !== undefined &&
    Number.isFinite(precoCriancaOverride) &&
    precoCriancaOverride > 0
      ? precoCriancaOverride
      : precoTarifario;
  const numAniv = numAniversariantes || 1;
  const minimoAplicavel =
    (config.minimosCriancasPorAniversariante ?? [])
      .filter((m) => m.aniversariantes <= numAniv)
      .sort((a, b) => b.aniversariantes - a.aniversariantes)[0]?.minimo ?? 10;
  const criancasFaturadas = Math.max(previsaoCriancas ?? 10, minimoAplicavel);
  const precoAdulto = Number(config.precoAdulto ?? 0);
  const custoAdultos = precoAdulto * (numAdultos || 0);
  return {
    estimativa: +(precoCrianca * criancasFaturadas + custoAdultos).toFixed(2),
    precoCrianca,
    criancasFaturadas,
    minimoAplicavel,
  };
}
