import prisma from "@festas/db";
import type { MetodoPagamento, Prisma } from "@prisma/client";

/**
 * Ledger de pagamentos - fonte única de verdade do "recebido".
 *
 * Cada pagamento é uma entrada no model Pagamento (valor + método + data).
 * O estado `pago` é DERIVADO: soma(pagamentos) >= total devido (ou explícito
 * no payload, para compatibilidade com chamadas existentes).
 *
 * Os AjustesPagamento (acertos) continuam a editar o TOTAL devido
 * (valorTotal/custoTotalFinal), nunca o recebido - não mexem no ledger.
 * Como o total devido muda, cada write-through de acerto RE-DERIVA o
 * estado `pago` (rederivarPagoReserva / rederivarPagoEntradaLivre).
 */

const EPS = 0.004;

const METODOS_VALIDOS: MetodoPagamento[] = [
  "DINHEIRO",
  "MULTIBANCO",
  "MBWAY",
  "TRANSFERENCIA",
  "CARTAO",
  "OUTRO",
];

export interface PagamentoInput {
  valor: number;
  metodo: MetodoPagamento;
  referencia?: string | null;
  nota?: string | null;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

type TX = Prisma.TransactionClient | typeof prisma;

/**
 * Normaliza/valida a lista de pagamentos do payload.
 * - undefined → "sem alterações"
 * - null/array → substituir o ledger existente (replace-all)
 * Lança PAGAMENTO_VALOR_INVALIDO / PAGAMENTO_METODO_OBRIGATORIO.
 */
export function normalizarPagamentos(lista?: PagamentoInput[] | null): PagamentoInput[] | undefined {
  if (lista === undefined) return undefined;
  if (lista === null) return [];
  return lista.map((p) => {
    const valor = round2(Number(p?.valor) || 0);
    if (!(valor > 0)) throw new Error("PAGAMENTO_VALOR_INVALIDO");
    const metodo = String(p?.metodo ?? "") as MetodoPagamento;
    if (!METODOS_VALIDOS.includes(metodo)) {
      throw new Error("PAGAMENTO_METODO_OBRIGATORIO");
    }
    return { valor, metodo, referencia: p.referencia ?? null, nota: p.nota ?? null };
  });
}

/**
 * Substitui o ledger de uma reserva (replace-all) e deriva o estado `pago`.
 * Deve correr dentro de uma transação que também persista as outras
 * alterações do pedido.
 */
export async function sincronizarPagamentosReserva(
  tx: TX,
  reservaId: string,
  pagamentos: PagamentoInput[],
  opcoes?: { pagoExplicito?: boolean; criadoPorId?: string | null },
): Promise<number> {
  const totalPago = round2(pagamentos.reduce((s, p) => s + p.valor, 0));

  await tx.pagamento.deleteMany({ where: { reservaId } });
  if (pagamentos.length > 0) {
    await tx.pagamento.createMany({
      data: pagamentos.map((p) => ({
        valor: p.valor,
        metodo: p.metodo,
        referencia: p.referencia ?? null,
        nota: p.nota ?? null,
        reservaId,
        criadoPorId: opcoes?.criadoPorId ?? null,
      })),
    });
  }

  const reserva = await tx.reserva.findUnique({
    where: { id: reservaId },
    select: { valorTotal: true },
  });
  const totalDevido = Number(reserva?.valorTotal ?? 0);
  const pago =
    opcoes?.pagoExplicito ??
    (totalDevido > 0 ? totalPago >= totalDevido - EPS : false);

  await tx.reserva.update({
    where: { id: reservaId },
    data: { pago },
  });

  return totalPago;
}

/** Seleção mínima da entrada necessária para derivar o estado `pago`. */
type EntradaParaDerivacao = {
  custoTotal: unknown;
  custoTotalFinal: unknown;
  pagoExcesso: boolean;
} | null;

/**
 * Regra de derivação do `pago` numa entrada livre:
 * - Com `pagoExcesso` (excesso pago à parte), basta cobrir o custo base.
 * - Sem excesso pago, o ledger tem de cobrir custoTotalFinal ?? custoTotal.
 * Centralizada para que sincronizar e re-derivar nunca divirjam.
 */
function derivarPagoEntrada(
  entrada: EntradaParaDerivacao,
  soma: number,
): boolean {
  if (!entrada) return false;
  const custoBase = Number(entrada.custoTotal ?? 0);
  const totalDevido = Number(entrada.custoTotalFinal ?? entrada.custoTotal ?? 0);
  if (entrada.pagoExcesso) return custoBase <= 0 || soma >= custoBase - EPS;
  return totalDevido > 0 ? soma >= totalDevido - EPS : false;
}

/**
 * Substitui o ledger de uma entrada livre (replace-all) e deriva o estado
 * `pago` (contra custoTotalFinal ?? custoTotal; com pagoExcesso basta o base).
 */
export async function sincronizarPagamentosEntradaLivre(
  tx: TX,
  entradaLivreId: string,
  pagamentos: PagamentoInput[],
  opcoes?: { pagoExplicito?: boolean; criadoPorId?: string | null },
): Promise<number> {
  const totalPago = round2(pagamentos.reduce((s, p) => s + p.valor, 0));

  await tx.pagamento.deleteMany({ where: { entradaLivreId } });
  if (pagamentos.length > 0) {
    await tx.pagamento.createMany({
      data: pagamentos.map((p) => ({
        valor: p.valor,
        metodo: p.metodo,
        referencia: p.referencia ?? null,
        nota: p.nota ?? null,
        entradaLivreId,
        criadoPorId: opcoes?.criadoPorId ?? null,
      })),
    });
  }

  const entrada = await tx.entradaLivre.findUnique({
    where: { id: entradaLivreId },
    select: { custoTotal: true, custoTotalFinal: true, pagoExcesso: true },
  });
  const pago =
    opcoes?.pagoExplicito ?? derivarPagoEntrada(entrada, totalPago);

  await tx.entradaLivre.update({
    where: { id: entradaLivreId },
    data: { pago },
  });

  return totalPago;
}

export async function rederivarPagoReserva(tx: TX, reservaId: string): Promise<boolean> {
  const [reserva, soma] = await Promise.all([
    tx.reserva.findUnique({ where: { id: reservaId }, select: { valorTotal: true } }),
    tx.pagamento.aggregate({ where: { reservaId }, _sum: { valor: true } }),
  ]);
  if (!reserva) return false;
  const totalDevido = Number(reserva.valorTotal ?? 0);
  const pago = totalDevido > 0 ? round2(Number(soma._sum.valor ?? 0)) >= totalDevido - EPS : false;
  await tx.reserva.update({ where: { id: reservaId }, data: { pago } });
  return pago;
}

/**
 * Re-deriva o estado `pago` de uma entrada livre a partir do ledger
 * persistido contra custoTotalFinal ?? custoTotal.
 */
export async function rederivarPagoEntradaLivre(tx: TX, entradaLivreId: string): Promise<boolean> {
  const [entrada, soma] = await Promise.all([
    tx.entradaLivre.findUnique({
      where: { id: entradaLivreId },
      select: { custoTotal: true, custoTotalFinal: true, pagoExcesso: true },
    }),
    tx.pagamento.aggregate({ where: { entradaLivreId }, _sum: { valor: true } }),
  ]);
  const pago = derivarPagoEntrada(entrada, round2(Number(soma._sum.valor ?? 0)));
  await tx.entradaLivre.update({ where: { id: entradaLivreId }, data: { pago } });
  return pago;
}

/** Total recebido a partir do ledger (aceita Decimal serializado). */
export function somaPagamentos(pagamentos: Array<{ valor: unknown }>): number {
  return round2(pagamentos.reduce((s, p) => s + Number(p.valor ?? 0), 0));
}

export const pagamentoService = {
  normalizarPagamentos,
  sincronizarPagamentosReserva,
  sincronizarPagamentosEntradaLivre,
  rederivarPagoReserva,
  rederivarPagoEntradaLivre,
  somaPagamentos,
};
