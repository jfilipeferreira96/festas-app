/**
 * Helpers de sincronização entre as duas representações de sala de
 * refeições/lanche: o Local marcado com isSalaLanche (usado no formulário de
 * festas como Reserva.localId) e a SalaLanche configurada nos slots
 * (SlotHorario.salaLancheId → Reserva.salaLancheId).
 *
 * A correspondência é feita pelo número contido no nome ("Sala 1" ↔
 * "Sala Refeições 1") ou, na falta de número, pelo nome exato.
 */

/** Primeiro número contido no nome ("Sala 1" → "1", "Sala Refeições 2" → "2"). */
export function numeroSala(nome: string | null | undefined): string | null {
  if (!nome) return null;
  const match = nome.match(/\d+/);
  return match ? match[0] : null;
}

interface Nomeavel {
  nome: string;
}

/** Encontra, numa lista, o item cujo número/nome corresponde ao de referência. */
export function encontrarSalaCorrespondente<T extends Nomeavel>(
  referencia: Nomeavel | null | undefined,
  candidatos: T[]
): T | null {
  if (!referencia) return null;
  const num = numeroSala(referencia.nome);
  const nomeNormalizado = referencia.nome.trim().toLowerCase();
  return (
    candidatos.find((c) => numeroSala(c.nome) !== null && numeroSala(c.nome) === num) ??
    candidatos.find((c) => c.nome.trim().toLowerCase() === nomeNormalizado) ??
    null
  );
}
