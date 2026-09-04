import { z } from "zod";
import type { CreateReservaData, Reserva } from "@/lib/api/reservas";
import { FESTA_COLORS } from "@/components/ui/FestaColorPicker";
import { calcIdade, isFimDeSemana, toISODate } from "@/lib/format";

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
const TIPOS_BOLO = ["PAIS_TRAZEM", "A_DECIDIR", "NOSSO_1KG", "NOSSO_2KG", "BOLO_ARTISTICO"] as const;
const CAUCOES = ["NAO_PAGA", "PAGA", "PAGA_NO_DIA"] as const;

export const festaFormSchema = z.object({
  aniversariantes: z.array(aniversarianteSchema).min(1, "Indique pelo menos um aniversariante"),
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoContacto: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  encarregadoCodigoPostal: z.string(),
  adicionarCliente: z.boolean(),
  encarregadosAdicionais: z.array(encarregadoAdicionalSchema),
  data: z.string().min(1, "Data é obrigatória"),
  horario: z.string().min(1, "Horário é obrigatório"),
  horaLanche: z.string(),
  duracaoMinutos: z.number().min(30, "Duração mínima é 30 minutos"),
  localId: z.string().min(1, "Seleccione uma sala"),
  salaLancheId: z.string(),
  cor: z.string(),
  menuId: z.string(),
  bolo: z.enum(TIPOS_BOLO).optional(),
  boloTema: z.string(),
  boloQuantidade: z.number().min(0).optional(),
  previsaoCriancas: z.number().min(1, "Mínimo 1 criança").max(100, "Máximo 100 crianças"),
  numCriancasConfirmadas: z.number().min(0).optional(),
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
  // Pagamento unificado: Total a pagar (editável) + Recebido nesta fase (pag. 1) + split (pag. 2)
  totalAPagar: z.number().min(0, "O total não pode ser negativo").optional(),
  metodoPagamento: z.enum(METODOS_PAGAMENTO).optional(),
  valorRecebido1: z.number().min(0).optional(),
  metodoPagamento2: z.enum(METODOS_PAGAMENTO).optional(),
  valorRecebido2: z.number().min(0).optional(),
  pago: z.boolean().optional(),
  caucao: z.enum(CAUCOES).optional(),
  valorCaucao: z.number().min(0).optional(),
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

export const CORES_PREDEFINIDAS = FESTA_COLORS.map((c) => ({ value: c.value, label: c.name }));

export const BOLO_BLOQUEIA_TEMA: readonly string[] = ["PAIS_TRAZEM", "A_DECIDIR"];

export function buildFestaDefaults(
  reserva: Reserva | null | undefined,
  initialValues?: FestaFormInitialValues
): FestaFormData {
  const aniversariantes = reserva?.aniversariantes?.length
    ? reserva.aniversariantes.map((a) => ({
        nome: a.aniversariante.nome,
        dataNascimento: a.aniversariante.dataNascimento ? a.aniversariante.dataNascimento.split("T")[0] : "",
      }))
    : [{ nome: "", dataNascimento: "" }];

  return {
    aniversariantes,
    encarregadoNome: reserva?.cliente?.nome ?? "",
    encarregadoContacto: reserva?.cliente?.telefone ?? "",
    encarregadoEmail: reserva?.cliente?.email ?? "",
    encarregadoCodigoPostal: reserva?.cliente?.codigoPostal ?? "",
    adicionarCliente: true,
    encarregadosAdicionais: [],
    data: reserva?.data ? toISODate(reserva.data) : (initialValues?.data ?? ""),
    horario: reserva?.horario ?? initialValues?.horario ?? "",
    horaLanche: reserva?.horaLanche ?? initialValues?.horaLanche ?? "",
    duracaoMinutos: reserva?.duracaoMinutos ?? initialValues?.duracaoMinutos ?? 120,
    localId: reserva?.localId ?? "",
    salaLancheId: reserva?.salaLancheId ?? initialValues?.salaLancheId ?? "",
    cor: reserva?.cor ?? initialValues?.cor ?? "",
    menuId: "",
    bolo: (reserva?.bolo || undefined) as FestaFormData["bolo"],
    boloTema: reserva?.boloTema ?? "",
    boloQuantidade: reserva?.boloQuantidade ?? undefined,
    previsaoCriancas: reserva?.numCriancas ?? reserva?.previsaoCriancas ?? 10,
    numCriancasConfirmadas: reserva?.numCriancasConfirmadas ?? undefined,
    extrasIds: reserva?.extras?.map((e) => e.extra.id) ?? [],
    extrasTexto: {},
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
    // Pagamento unificado: total acordado (valorTotal, fallback valorPago) + recebido pag.1
    totalAPagar: reserva ? Number(reserva.valorTotal ?? reserva.valorPago ?? 0) || undefined : undefined,
    metodoPagamento: undefined,
    valorRecebido1: reserva?.valorPago ? Number(reserva.valorPago) : undefined,
    metodoPagamento2: undefined,
    valorRecebido2: reserva?.valorPago2 ? Number(reserva.valorPago2) : undefined,
    pago: reserva?.pago ?? false,
    caucao: (reserva?.caucao || undefined) as FestaFormData["caucao"],
    valorCaucao: reserva?.valorCaucao ? Number(reserva.valorCaucao) : undefined,
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
      : data.menuId || null
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
    data: data.data,
    horario: data.horario,
    horaLanche: data.horaLanche || undefined,
    duracaoMinutos: data.duracaoMinutos,
    localId: data.localId,
    salaLancheId: data.salaLancheId || undefined,
    numCriancas: data.previsaoCriancas,
    numCriancasConfirmadas: data.numCriancasConfirmadas || undefined,
    extrasIds: data.extrasIds.length > 0 ? data.extrasIds : undefined,
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
    tema: data.tema || undefined,
    notas,
    notasCacifos: data.notasCacifos || undefined,
    notasLanche: data.notasLanche || undefined,
    observacoesGerais: data.observacoesGerais || undefined,
    observacoesLesoes: data.observacoesLesoes || undefined,
    observacoesBrindes: data.observacoesBrindes || undefined,
    outrosExtras: data.outrosExtras || undefined,
    valorTotal: opts.isEdit ? undefined : data.totalAPagar || undefined,
    metodoPagamento: opts.isEdit ? undefined : data.metodoPagamento,
    valorPago: opts.isEdit ? undefined : data.valorRecebido1 || undefined,
    metodoPagamento2: opts.isEdit ? undefined : data.metodoPagamento2,
    valorPago2: opts.isEdit ? undefined : data.valorRecebido2 || undefined,
    pago: opts.isEdit ? undefined : data.pago,
    caucao: opts.isEdit ? undefined : data.caucao,
    valorCaucao: opts.isEdit ? undefined : data.valorCaucao || undefined,
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
  minimosCriancasPorAniversariante?: { aniversariantes: number; minimo: number }[] | null;
}

/**
 * Estimativa do total da festa: preço por criança × nº de crianças faturadas
 * (respeitando o mínimo aplicável por nº de aniversariantes).
 */
export function calcularEstimativaFesta(
  config: EstimativaConfig | null | undefined,
  dataFesta: string | undefined,
  previsaoCriancas: number | undefined,
  numAniversariantes: number
): EstimativaFestaInfo {
  if (!config || !dataFesta) {
    return { estimativa: 0, precoCrianca: 0, criancasFaturadas: 0, minimoAplicavel: 0 };
  }
  const precoCrianca = isFimDeSemana(dataFesta)
    ? Number(config.precoCriancaFimSemana)
    : Number(config.precoCriancaSemana);
  const numAniv = numAniversariantes || 1;
  const minimoAplicavel =
    (config.minimosCriancasPorAniversariante ?? [])
      .filter((m) => m.aniversariantes <= numAniv)
      .sort((a, b) => b.aniversariantes - a.aniversariantes)[0]?.minimo ?? 10;
  const criancasFaturadas = Math.max(previsaoCriancas ?? 10, minimoAplicavel);
  return {
    estimativa: precoCrianca * criancasFaturadas,
    precoCrianca,
    criancasFaturadas,
    minimoAplicavel,
  };
}
