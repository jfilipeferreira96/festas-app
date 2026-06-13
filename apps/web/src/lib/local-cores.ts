// Paleta de cores consistente para locais no timeline e calendário.
// A cor é determinada pelo id do local, garantindo que o mesmo local
// tem sempre a mesma cor (estável entre renders).

export const LOCAL_CORES = [
  { bg: "#465fff", text: "#ffffff", soft: "var(--color-brand-50)", softText: "var(--color-brand-600)" }, // brand/blue
  { bg: "#3dc47e", text: "#ffffff", soft: "var(--color-accent-green-50)", softText: "var(--color-accent-green-600)" },
  { bg: "#f29423", text: "#ffffff", soft: "var(--color-accent-orange-50)", softText: "var(--color-accent-orange-600)" },
  { bg: "#ee5d50", text: "#ffffff", soft: "var(--color-accent-red-50)", softText: "var(--color-accent-red-600)" },
  { bg: "#8648a0", text: "#ffffff", soft: "var(--color-accent-purple-50)", softText: "var(--color-accent-purple-600)" },
  { bg: "#0fb88a", text: "#ffffff", soft: "#e6f7f2", softText: "#0a8c69" },
  { bg: "#2ca6e0", text: "#ffffff", soft: "#e6f5fc", softText: "#1d7eab" },
  { bg: "#e6a23c", text: "#ffffff", soft: "#fdf3e3", softText: "#b07a1f" },
] as const;

/** Retorna uma cor estável para um dado id (qualquer string). */
export function corPorId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return LOCAL_CORES[hash % LOCAL_CORES.length];
}
