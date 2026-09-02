/**
 * Método de pagamento — fonte única de verdade.
 *
 * TODOS os selects e displays de método de pagamento (festas, entradas livres,
 * dashboard, relatórios) devem usar estas opções/labels para evitar
 * discrepâncias (ex.: "Transferência" vs "Transferência Bancária").
 */

export const METODO_PAGAMENTO_OPTIONS = [
  { value: "NONE", label: "Não definido" },
  { value: "DINHEIRO", label: "Dinheiro" },
  { value: "MULTIBANCO", label: "Multibanco" },
  { value: "MBWAY", label: "MB WAY" },
  { value: "TRANSFERENCIA", label: "Transferência Bancária" },
  { value: "CARTAO", label: "Cartão" },
  { value: "OUTRO", label: "Outro" },
];

/** Labels sem a pseudo-opção "NONE" (para exibição e mapas). */
export const METODO_PAGAMENTO_LABELS: Record<string, string> = Object.fromEntries(
  METODO_PAGAMENTO_OPTIONS.filter((o) => o.value !== "NONE").map((o) => [o.value, o.label])
);

/**
 * Label legível de um método.
 * @param value  Valor guardado (ex.: "MULTIBANCO", null, "NONE")
 * @param fallback Texto quando não definido (default "—")
 */
export function metodoPagamentoLabel(value?: string | null, fallback = "—"): string {
  if (!value || value === "NONE") return fallback;
  return METODO_PAGAMENTO_LABELS[value] ?? value;
}
