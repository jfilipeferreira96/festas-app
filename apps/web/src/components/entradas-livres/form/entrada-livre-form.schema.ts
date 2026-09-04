import { z } from "zod";
import type { CriarEntradaLivreDTO, EntradaLivre } from "@/lib/api/entradaLivre";

const METODOS_PAGAMENTO = ["DINHEIRO", "MULTIBANCO", "MBWAY", "TRANSFERENCIA", "CARTAO", "OUTRO"] as const;

const criancaSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  idade: z.string(),
  querLanche: z.boolean(),
});

export const entradaLivreFormSchema = z.object({
  criancas: z.array(criancaSchema).min(1, "Indique pelo menos uma criança"),
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoTelefone: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  duracaoMinutos: z.number().min(60, "Duração mínima é 1 hora"),
  custoTotal: z.number().min(0, "O custo não pode ser negativo").optional(),
  metodoPagamento: z.enum(METODOS_PAGAMENTO).optional(),
  pago: z
    .boolean()
    .optional()
    .refine((v) => v !== undefined, { message: "É obrigatório indicar o estado do pagamento" }),
  cacifoId: z.string(),
  observacoes: z.string(),
  observacoesLesoes: z.string(),
  temLanche: z.boolean(),
  horaLanche: z.string(),
  numAdultos: z.number().min(0),
  metodoPagamento2: z.enum(METODOS_PAGAMENTO).optional(),
  valorPago2: z.number().min(0).optional(),
  meiasQuantidade: z.number().min(0),
  extrasIds: z.array(z.string()),
  extrasQuantidades: z.record(z.string(), z.number()),
});

export type EntradaLivreFormData = z.infer<typeof entradaLivreFormSchema>;
export type EntradaLivreMetodoPagamento = (typeof METODOS_PAGAMENTO)[number];

export const DURACAO_ENTRADA_OPTIONS = [
  { value: "60", label: "1 hora" },
  { value: "120", label: "2 horas" },
  { value: "180", label: "3 horas" },
];

export const ESTADO_PAGAMENTO_OPTIONS = [
  { value: "", label: "Seleccionar..." },
  { value: "true", label: "Pago" },
  { value: "false", label: "Não pago" },
];

export function buildEntradaLivreDefaults(entrada: EntradaLivre | null | undefined): EntradaLivreFormData {
  return {
    criancas: entrada?.criancas?.length
      ? entrada.criancas.map((c) => ({
          nome: c.nome,
          idade: c.idade != null ? String(c.idade) : "",
          querLanche: c.querLanche !== false,
        }))
      : [{ nome: "", idade: "", querLanche: true }],
    encarregadoNome: entrada?.encarregadoNome ?? "",
    encarregadoTelefone: entrada?.encarregadoTelefone ?? "",
    encarregadoEmail: entrada?.encarregadoEmail ?? "",
    duracaoMinutos: entrada?.duracaoMinutos ?? 60,
    custoTotal: entrada?.custoTotal,
    metodoPagamento: undefined,
    pago: entrada?.pago,
    cacifoId: entrada?.cacifoId ?? "",
    observacoes: entrada?.observacoes ?? "",
    observacoesLesoes: entrada?.observacoesLesoes ?? "",
    temLanche: entrada?.temLanche ?? false,
    horaLanche: entrada?.horaLanche ?? "",
    numAdultos: entrada?.numAdultos ?? 0,
    metodoPagamento2: undefined,
    valorPago2: entrada?.valorPago2 ?? 0,
    meiasQuantidade: entrada?.meiasQuantidade ?? 0,
    extrasIds: entrada?.extras?.map((e) => e.extraId) ?? [],
    extrasQuantidades: Object.fromEntries(
      (entrada?.extras ?? []).map((e) => [e.extraId, e.quantidade ?? 1])
    ),
  };
}

export function buildEntradaPayload(
  data: EntradaLivreFormData,
  opts: { isEdit: boolean }
): CriarEntradaLivreDTO {
  return {
    criancas: data.criancas.map((c) => ({
      nome: c.nome.trim(),
      idade: c.idade ? parseInt(c.idade, 10) : undefined,
      querLanche: c.querLanche,
    })),
    encarregadoNome: data.encarregadoNome,
    encarregadoTelefone: data.encarregadoTelefone,
    encarregadoEmail: data.encarregadoEmail || undefined,
    duracaoMinutos: data.duracaoMinutos,
    custoTotal: data.custoTotal,
    metodoPagamento: opts.isEdit ? undefined : data.metodoPagamento,
    pago: opts.isEdit ? undefined : data.pago,
    cacifoId: data.cacifoId || null,
    extrasIds: data.extrasIds,
    extrasQuantidades: Object.fromEntries(
      data.extrasIds.map((id) => [id, data.extrasQuantidades[id] ?? 1])
    ),
    observacoes: data.observacoes || undefined,
    observacoesLesoes: data.observacoesLesoes || undefined,
    temLanche: data.temLanche,
    horaLanche: data.horaLanche || (opts.isEdit ? null : undefined),
    numAdultos: data.numAdultos,
    metodoPagamento2: opts.isEdit ? undefined : data.metodoPagamento2,
    valorPago2: opts.isEdit ? undefined : data.valorPago2 || undefined,
    meiasQuantidade: data.meiasQuantidade || undefined,
  };
}
