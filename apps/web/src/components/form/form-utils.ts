export function scrollToFirstFormError(): void {
  const firstError = document.querySelector(
    "[data-error='true'], .border-error-500, .border-accent-red-400"
  );
  if (firstError instanceof HTMLElement) {
    firstError.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

/**
 * Extrai as mensagens de erro de um objeto FieldErrors do react-hook-form
 * (percorre até 2 níveis de aninhamento - suficiente para arrays como
 * aniversariantes/crianças/pagamentos). Devolve apenas as mensagens PT,
 * já descritivas - sem expor nomes técnicos dos campos.
 */
export function mensagensDeErro(errors: Record<string, unknown>): string[] {
  const mensagens: string[] = [];
  for (const err of Object.values(errors)) {
    if (!err || typeof err !== "object") continue;
    const e = err as { message?: unknown; [k: string]: unknown };
    if (typeof e.message === "string" && e.message) {
      mensagens.push(e.message);
      continue;
    }
    // Aninhado (array ou objeto)
    for (const subErr of Object.values(e)) {
      if (!subErr || typeof subErr !== "object") continue;
      const se = subErr as { message?: unknown };
      if (typeof se.message === "string" && se.message) {
        mensagens.push(se.message);
      }
    }
  }
  return mensagens;
}
