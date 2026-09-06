import { z } from "zod";
import { calcIdade, toISODate } from "@/lib/format";
import type { CriarEntradaLivreDTO, EntradaLivre } from "@/lib/api/entradaLivre";

const METODOS_PAGAMENTO = ["DINHEIRO", "MULTIBANCO", "MBWAY", "TRANSFERENCIA", "CARTAO", "OUTRO"] as const;

/** Data de nascimento por omissão (quando desconhecida) - igual ao placeholder pedido. */
export const DATA_NASCIMENTO_DEFAULT = "2020-01-01";

/**
 * Aproxima a data de nascimento a partir de uma idade conhecida
 * (registos antigos só guardavam a idade) - 01-01 do ano calculado.
 */
export function dataNascimentoDeIdade(idade?: number | null): string {
  if (idade == null || !Number.isFinite(idade) || idade < 0) return DATA_NASCIMENTO_DEFAULT;
  const ano = new Date().getFullYear() - Math.floor(idade);
  return `${ano}-01-01`;
}

const criancaSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  dataNascimento: z.string(),
  querLanche: z.boolean(),
});

// Encarregados adicionais (mesma estrutura do form de Festas)
const encarregadoAdicionalSchema = z.object({
  nome: z.string(),
  contacto: z.string(),
  email: z.string(),
  codigoPostal: z.string(),
});

export const entradaLivreFormSchema = z.object({
  criancas: z.array(criancaSchema).min(1, "Indique pelo menos uma criança"),
  encarregadoNome: z.string().min(1, "Nome do encarregado é obrigatório"),
  encarregadoTelefone: z.string().min(9, "Contacto inválido"),
  encarregadoEmail: z.string().email("Email inválido").optional().or(z.literal("")),
  encarregadoCodigoPostal: z.string(),
  adicionarCliente: z.boolean(),
  encarregadosAdicionais: z.array(encarregadoAdicionalSchema),
  duracaoMinutos: z.number().min(60, "Duração mínima é 1 hora"),
  // Pagamento (ledger): custo total (editável) + lista de pagamentos realizados
  custoTotal: z.number().min(0, "O custo não pode ser negativo").optional(),
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
  pago: z.boolean().optional(),
  cacifoId: z.string(),
  observacoes: z.string(),
  observacoesLesoes: z.string(),
  temLanche: z.boolean(),
  horaLanche: z.string(),
  numAdultos: z.number().min(0),
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

export function buildEntradaLivreDefaults(entrada: EntradaLivre | null | undefined): EntradaLivreFormData {
  return {
    criancas: entrada?.criancas?.length
      ? entrada.criancas.map((c) => ({
          nome: c.nome,
          dataNascimento: dataNascimentoDeIdade(c.idade),
          querLanche: c.querLanche !== false,
        }))
      : [{ nome: "", dataNascimento: DATA_NASCIMENTO_DEFAULT, querLanche: true }],
    encarregadoNome: entrada?.encarregadoNome ?? "",
    encarregadoTelefone: entrada?.encarregadoTelefone ?? "",
    encarregadoEmail: entrada?.encarregadoEmail ?? "",
    encarregadoCodigoPostal: "",
    adicionarCliente: true,
    encarregadosAdicionais: [],
    duracaoMinutos: entrada?.duracaoMinutos ?? 60,
    custoTotal: entrada?.custoTotal,
    pagamentos: entrada?.pagamentos?.map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo,
      nota: p.nota ?? undefined,
      createdAt: p.createdAt,
    })),
    pago: entrada?.pago,
    cacifoId: entrada?.cacifoId ?? "",
    observacoes: entrada?.observacoes ?? "",
    observacoesLesoes: entrada?.observacoesLesoes ?? "",
    temLanche: entrada?.temLanche ?? false,
    horaLanche: entrada?.horaLanche ?? "",
    numAdultos: entrada?.numAdultos ?? 0,
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
  const hoje = toISODate(new Date());
  // Encarregados adicionais: mesma lógica do form de Festas - vão para as
  // observações em texto ("Encarregado 2: Nome · contacto · email · CP").
  const adicionaisTexto = data.encarregadosAdicionais
    .filter((e) => e.nome.trim())
    .map((e, i) => {
      const partes = [`Encarregado ${i + 2}: ${e.nome}`, e.contacto, e.email, e.codigoPostal].filter(Boolean);
      return partes.join(" · ");
    })
    .join("\n");
  return {
    criancas: data.criancas.map((c) => ({
      nome: c.nome.trim(),
      // Idade calculada a partir da data de nascimento (API continua a receber só a idade)
      idade: c.dataNascimento ? calcIdade(c.dataNascimento, hoje) : undefined,
      querLanche: c.querLanche,
    })),
    encarregadoNome: data.encarregadoNome,
    encarregadoTelefone: data.encarregadoTelefone,
    encarregadoEmail: data.encarregadoEmail || undefined,
    encarregadoCodigoPostal: data.encarregadoCodigoPostal || undefined,
    duracaoMinutos: data.duracaoMinutos,
    custoTotal: data.custoTotal,
    pagamentos: opts.isEdit ? undefined : data.pagamentos,
    // Criação exige estado explícito (PAGAMENTO_OBRIGATORIO): deriva do ledger
    pago: opts.isEdit
      ? undefined
      : (data.pago ??
        (data.custoTotal != null
          ? (data.pagamentos ?? []).reduce((s, p) => s + p.valor, 0) >= data.custoTotal - 0.004
          : false)),
    cacifoId: data.cacifoId || null,
    extrasIds: data.extrasIds,
    extrasQuantidades: Object.fromEntries(
      data.extrasIds.map((id) => [id, data.extrasQuantidades[id] ?? 1])
    ),
    observacoes: [data.observacoes, adicionaisTexto].filter(Boolean).join("\n\n") || undefined,
    observacoesLesoes: data.observacoesLesoes || undefined,
    temLanche: data.temLanche,
    horaLanche: data.horaLanche || (opts.isEdit ? null : undefined),
    numAdultos: data.numAdultos,
    meiasQuantidade: data.meiasQuantidade || undefined,
  };
}
