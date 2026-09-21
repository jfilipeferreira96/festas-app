/**
 * Tipos de bolo produzidos pela casa (a encomendar/imprimir para a cozinha).
 * Fonte única - era duplicado em ~3 ficheiros (print-bolos, BolosContent).
 */
export const BOLOS_NOSSOS = ["NOSSO_1KG", "NOSSO_2KG", "BOLO_ARTISTICO"] as const;

export type BoloNosso = (typeof BOLOS_NOSSOS)[number];

/** Type guard: o valor é um tipo de bolo da casa? */
export function ehBoloNosso(bolo: unknown): bolo is BoloNosso {
  return typeof bolo === "string" && (BOLOS_NOSSOS as readonly string[]).includes(bolo);
}

/**
 * Labels para o tipo de bolo - usados em FestaDetailModal e FestasTabela
 */
export const BOLO_LABELS: Record<string, string> = {
  PAIS_TRAZEM: "Pais trazem o bolo",
  A_DECIDIR: "Ainda vão decidir",
  NOSSO_1KG: "Nosso bolo 1kg",
  NOSSO_2KG: "Nosso bolo 2kg",
  BOLO_ARTISTICO: "Bolo artístico",
};


export function ehSubcategoriaBolos(subcategoria: string | null | undefined): boolean {
  return !!subcategoria && subcategoria.trim().toLowerCase() === "bolos";
}

/**
 * Opções do dropdown "Tipo interno (cozinha)" na config de Extras - a ponte
 * entre o catálogo de bolos (extras subcategoria "Bolos") e a coluna
 * Reserva.bolo que alimenta cozinha/email/lanche.
 */
export const BOLO_TIPO_INTERNO_OPTIONS = [
  { value: "", label: "Sem tipo interno (não vai para a cozinha)" },
  ...BOLOS_NOSSOS.map((tipo) => ({ value: tipo, label: BOLO_LABELS[tipo] ?? tipo })),
] as const;

/**
 * Labels abreviados para tabelas (menos espaço)
 */
export const BOLO_LABELS_SHORT: Record<string, string> = {
  PAIS_TRAZEM: "Pais trazem",
  A_DECIDIR: "A decidir",
  NOSSO_1KG: "Nosso 1kg",
  NOSSO_2KG: "Nosso 2kg",
  BOLO_ARTISTICO: "Artístico",
};