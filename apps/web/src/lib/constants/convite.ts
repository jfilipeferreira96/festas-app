/**
 * Constantes do convite de festa (imagem assets/convite/convite.jpeg preenchida
 * e enviada como anexo do email de confirmação da reserva).
 */

/** Contacto impresso no convite ("para o n° ___"); renderizado como "(+351) 927 104 432". */
export const CONVITE_TELEFONE = "+351 927 104 432";

/** Email de contacto do espaço (uso futuro / rodapé). */
export const CONVITE_EMAIL = "geral@baselandia.pt";

/** Prazo de confirmação da presença: dias ANTES do dia da festa. */
export const CONVITE_DIAS_LIMITE = 2;

/** Meses por extenso em pt-PT (formato impresso no convite). */
export const MESES_PT: readonly string[] = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;
