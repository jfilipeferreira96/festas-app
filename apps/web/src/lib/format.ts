export function formatEuro(value: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(value);
}

export function toISODate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addMinutosToTime(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + minutos;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function calcIdade(dataNascimento: string, dataReferencia: string): number {
  if (!dataNascimento || !dataReferencia) return 0;
  const nasc = new Date(dataNascimento);
  const ref = new Date(dataReferencia);
  let idade = ref.getFullYear() - nasc.getFullYear();
  const m = ref.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < nasc.getDate())) idade--;
  return Math.max(0, idade);
}

export function isFimDeSemana(dataISO: string): boolean {
  const dia = new Date(`${dataISO}T00:00:00`).getDay();
  return dia === 0 || dia === 6;
}
