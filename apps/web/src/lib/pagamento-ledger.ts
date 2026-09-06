import { metodoPagamentoLabel } from "./metodo-pagamento";

/**
 * Ledger de pagamentos - fonte única de verdade para "o que já foi recebido".
 *
 * Em vez de campos fixos de 1º/2º pagamento (valorPago/valorPago2), cada
 * pagamento é uma entrada no ledger (valor + método + data). O estado "pago"
 * é DERIVADO: soma(pagamentos) >= total devido. Ajustes são "edições" ao
 * total acordado (acréscimo/desconto com motivo). A caução tem linha própria
 * mas conta para o total a entregar no dia.
 *
 * Tipos + helpers puros partilhados pela UI (alinhados com o model Prisma
 * `Pagamento` e @saas/shared-types).
 */

export type MetodoPagamentoValor =
  | "DINHEIRO"
  | "MULTIBANCO"
  | "MBWAY"
  | "TRANSFERENCIA"
  | "CARTAO"
  | "OUTRO";

export type EstadoCaucaoValor = "NAO_PAGA" | "PAGA" | "PAGA_NO_DIA";

export interface PagamentoLedgerItem {
  id: string;
  /** Valor recebido (€, positivo). */
  valor: number;
  metodo: MetodoPagamentoValor;
  /** Ref. MB Way / transferência, quando aplicável. */
  referencia?: string | null;
  /** Nota livre (ex.: "Sinal", "Resto no dia"). */
  nota?: string | null;
  /** ISO string - quando o pagamento foi recebido. */
  createdAt: string;
}

/** Ajuste manual ao total (acréscimo/desconto) - "edição" do valor acordado. */
export interface AjusteEdicao {
  id: string;
  tipo: "ACRESCIMO" | "DESCONTO";
  valor: number;
  motivo: string;
}

/** Tolerância de cêntimos para comparações de igualdade. */
export const EPS = 0.004;

export function arredondar2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** Soma de todos os pagamentos do ledger. */
export function totalPago(pagamentos: PagamentoLedgerItem[]): number {
  return arredondar2(pagamentos.reduce((sum, p) => sum + (Number(p.valor) || 0), 0));
}

/** O que falta receber = total devido − total pago (nunca negativo). */
export function faltaPagar(totalDevido: number, pagamentos: PagamentoLedgerItem[]): number {
  return Math.max(0, arredondar2(totalDevido - totalPago(pagamentos)));
}

/** Liquidado quando o total devido (> 0) está coberto pelos pagamentos. */
export function estaLiquidado(totalDevido: number, pagamentos: PagamentoLedgerItem[]): boolean {
  return totalDevido > 0 && faltaPagar(totalDevido, pagamentos) <= EPS;
}

/** Total a pagar após ajustes (ajustes = edições ao valor acordado). */
export function aplicarAjustes(subtotal: number, ajustes: AjusteEdicao[]): number {
  return arredondar2(
    ajustes.reduce(
      (total, a) => total + (a.tipo === "ACRESCIMO" ? a.valor : -a.valor),
      subtotal,
    ),
  );
}

/** Labels PT-PT da caução (sem acoplar ao form das festas). */
export const CAUCAO_LABELS: Record<EstadoCaucaoValor, string> = {
  NAO_PAGA: "Não paga",
  PAGA: "Paga",
  PAGA_NO_DIA: "Paga no dia",
};

/** Resumo de um ledger para exibição: total recebido + rótulos dos métodos. */
export function resumoLedger(
  pagamentos?: Array<{ valor: unknown; metodo: string }> | null,
): { totalPago: number; temPagamentos: boolean; metodos: string } {
  const lista = pagamentos ?? [];
  const totalPago = arredondar2(lista.reduce((s, p) => s + Number(p.valor ?? 0), 0));
  const metodos = lista.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ");
  return { totalPago, temPagamentos: lista.length > 0, metodos };
}
