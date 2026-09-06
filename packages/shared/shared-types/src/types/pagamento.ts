// ===================================
// Pagamento - entrada do ledger de pagamentos
// ===================================
// Cada pagamento é uma entrada no ledger (valor + método + data).
// O estado "pago" é derivado: soma(pagamentos) >= total devido.

import type { MetodoPagamento } from "./reserva";

export interface Pagamento {
  id: string;
  /** Valor recebido (positivo). */
  valor: number;
  metodo: MetodoPagamento;
  referencia?: string;
  /** Nota livre (ex.: "Sinal", "Migrado"). */
  nota?: string;
  createdAt: string;
  /** Alvo (exatamente um dos dois). */
  reservaId?: string;
  entradaLivreId?: string;
  criadoPorId?: string;
  criadoPor?: { id: string; name: string } | null;
}

/** Payload de criação de um pagamento (dentro do create/atualizarPagamento). */
export interface CriarPagamentoDTO {
  valor: number;
  metodo: MetodoPagamento;
  referencia?: string | null;
  nota?: string | null;
}
