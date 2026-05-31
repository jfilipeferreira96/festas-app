// ===================================
// Defaults — Itens de lanche por omissão
// ===================================

export interface ItemLancheDefault {
  nome: string;
  icone?: string;
}

export const LANCHE_DEFAULTS: ItemLancheDefault[] = [
  { nome: "Bolo de Aniversário", icone: "🎂" },
  { nome: "Pipocas", icone: "🍿" },
  { nome: "Croissants", icone: "🥐" },
  { nome: "Pizzas", icone: "🍕" },
  { nome: "Nuggets", icone: "🍗" },
  { nome: "Sumos", icone: "🧃" },
  { nome: "Água", icone: "💧" },
  { nome: "Sandes", icone: "🥪" },
  { nome: "Fruta", icone: "🍎" },
  { nome: "Gelatina", icone: "🍮" },
];

export const DURACAO_OPCOES = [
  { label: "1 hora", valor: 60 },
  { label: "1h30m", valor: 90 },
  { label: "2 horas", valor: 120 },
  { label: "2h30m", valor: 150 },
  { label: "3 horas", valor: 180 },
];
