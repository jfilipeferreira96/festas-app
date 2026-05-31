// ===================================
// Defaults — Extras disponíveis por omissão
// ===================================

export interface ExtraDefault {
  nome: string;
  precoUnitario: number;
  icone?: string;
}

export const EXTRAS_DEFAULTS: ExtraDefault[] = [
  { nome: "Turbo Slide", precoUnitario: 50.0, icone: "🎡" },
  { nome: "Laser Show", precoUnitario: 40.0, icone: "🔦" },
  { nome: "Máquina de Gelo", precoUnitario: 35.0, icone: "🧊" },
  { nome: "Pinturas Faciais", precoUnitario: 30.0, icone: "🎨" },
  { nome: "Algodão Doce", precoUnitario: 3.0, icone: "🍬" },
  { nome: "Palhaço", precoUnitario: 80.0, icone: "🤡" },
  { nome: "Mágico", precoUnitario: 100.0, icone: "🎩" },
  { nome: "Lembranças", precoUnitario: 35.0, icone: "🎁" },
  { nome: "Foto Booth", precoUnitario: 60.0, icone: "📸" },
  { nome: "Karaoke", precoUnitario: 45.0, icone: "🎤" },
];
