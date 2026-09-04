// ===================================
// FESTA COLORS - Paleta de cores BasyLandy
// ===================================
// Fonte única de verdade para cores de festa (pulseiras, slots, reservas, UI).
// Usada pelo seed:dev e pelo FestaColorPicker do frontend.
// Apenas estas 8 cores são válidas para pulseiras em todo o sistema.

export const FESTA_COLORS = [
  { name: "Azul", value: "#0095C8" },
  { name: "Verde", value: "#5CBE4A" },
  { name: "Amarelo", value: "#FCE12D" },
  { name: "Laranja", value: "#F59253" },
  { name: "Rosa", value: "#E54796" },
  { name: "Verde-água", value: "#00A68A" },
  { name: "Roxo", value: "#993B98" },
  { name: "Cinzento", value: "#8A8E91" },
] as const;

export type FestaColor = (typeof FESTA_COLORS)[number];

/** Lista de valores hex das cores (para validação rápida) */
export const FESTA_COLOR_VALUES: readonly string[] = FESTA_COLORS.map((c) => c.value);

/** Primeira cor disponível (não usada por outras festas do dia) */
export function findAvailableColor(coresUsadas: string[]): string {
  for (const c of FESTA_COLORS) {
    if (!coresUsadas.includes(c.value)) return c.value;
  }
  return FESTA_COLORS[0]!.value;
}
