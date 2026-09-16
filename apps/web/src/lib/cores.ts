import { FESTA_COLORS } from "@saas/shared-defaults";

/**
 * Regra do plano diário (pulseiras): a mesma cor NÃO pode coexistir no
 * parque ao mesmo tempo. Uma cor está "em conflito" quando é usada por
 * uma festa activa cujo intervalo [início, início+duração) se sobrepõe
 * ao intervalo candidato. Festas desfasadas podem repetir cor.
 */

export interface FestaComIntervalo {
  cor: string | null;
  horario: string;
  duracaoMinutos: number;
}

/** Converte "HH:MM" para minutos desde a meia-noite */
function toMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Cores de pulseira em conflito com o intervalo candidato
 * (usadas por festas que se sobrepõem no tempo).
 */
export function coresEmConflito(
  festas: FestaComIntervalo[],
  inicio: string,
  duracaoMin: number
): string[] {
  const ini = toMinutes(inicio);
  const fim = ini + (duracaoMin || 0);
  return festas
    .filter((f): f is FestaComIntervalo & { cor: string } => !!f.cor)
    .filter((f) => {
      const fi = toMinutes(f.horario);
      const ff = fi + (f.duracaoMinutos || 0);
      return ini < ff && fi < fim;
    })
    .map((f) => f.cor);
}

/**
 * Primeira cor da paleta sem conflito temporal, preferindo a cor
 * sugerida (ex.: corDefault do slot). Nunca devolve cor em conflito.
 */
export function corDisponivel(coresConflito: string[], preferida?: string | null): string {
  if (preferida && !coresConflito.includes(preferida)) return preferida;
  for (const c of FESTA_COLORS) {
    if (!coresConflito.includes(c.value)) return c.value;
  }
  return FESTA_COLORS[0]!.value;
}
