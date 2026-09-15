export const IDADE_MIN_CRIANCA = 3;
export const IDADE_MAX_CRIANCA = 12;

export function idadeForaIntervalo(idade: number): boolean {
  return idade < IDADE_MIN_CRIANCA || idade > IDADE_MAX_CRIANCA;
}
