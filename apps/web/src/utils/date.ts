/**
 * Formata data ISO para PT-PT (DD/MM/YYYY)
 * @example formatDate("2026-05-21") -> "21/05/2026"
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  
  // Se for ISO string completa, extrair apenas a data
  const dateOnly = dateStr.split("T")[0];
  
  const [year, month, day] = dateOnly.split("-");
  if (!year || !month || !day) return "—";
  
  return `${day}/${month}/${year}`;
}

/**
 * Formata data completa com hora
 * @example formatDateTime("2026-05-21", "10:00") -> "21/05/2026 às 10:00"
 */
export function formatDateTime(dateStr: string, time?: string): string {
  if (!dateStr) return "—";
  return `${formatDate(dateStr)}${time ? ` às ${time}` : ""}`;
}

/**
 * Formata data para exibição curta
 * @example formatShortDate("2026-05-21") -> "21/05"
 */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return "—";
  const dateOnly = dateStr.split("T")[0];
  const [_, month, day] = dateOnly.split("-");
  if (!month || !day) return "—";
  return `${day}/${month}`;
}

/**
 * Converte minutos para formato de duração
 * @example formatDuration(90) -> "1h30"
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h${mins.toString().padStart(2, "0")}` : `${hours}h`;
}

/**
 * Formata valor em centimos para euros
 * @example formatEuro(350) -> "3,50 €"
 */
export function formatEuro(cents: number): string {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}