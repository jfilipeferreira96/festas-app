// ===================================
// Defaults — Itens de lanche por omissão
// ===================================

export interface ItemLancheDefault {
  nome: string;
  icone?: string;
}

// Itens base do Menu BasyLandy + extras ao lanche disponíveis
export const LANCHE_DEFAULTS: ItemLancheDefault[] = [
  // ─── Base (incluídos no Menu BasyLandy) ───────────────────
  { nome: "Gelatina", icone: "🍮" },
  { nome: "Água e sumo", icone: "🧃" },
  { nome: "Batatas fritas", icone: "🍟" },
  { nome: "Pão de forma (queijo, fiambre, chocolate ou manteiga)", icone: "🍞" },
  { nome: "Bolo de Aniversário", icone: "🎂" },
  // ─── Extras ao lanche (suplemento) ────────────────────────
  { nome: "Cenoura Baby", icone: "🥕" },
  { nome: "Queijo babybel", icone: "🧀" },
  { nome: "Pipocas", icone: "🍿" },
  { nome: "Pizzas", icone: "🍕" },
  { nome: "Bolachas", icone: "🍪" },
  { nome: "Nuggets", icone: "🍗" },
  { nome: "Donuts", icone: "🍩" },
  { nome: "Fruta da época", icone: "🍎" },
  { nome: "Muffins", icone: "🧁" },
];

export const DURACAO_OPCOES = [
  { label: "1 hora", valor: 60 },
  { label: "1h30m", valor: 90 },
  { label: "2 horas", valor: 120 },
  { label: "2h30m", valor: 150 },
  { label: "3 horas", valor: 180 },
];
