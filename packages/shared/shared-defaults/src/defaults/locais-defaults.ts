// ===================================
// Defaults - Locais (salas) por omissão
// ===================================

export interface LocalDefault {
  nome: string;
  capacidade: number;
}

export const LOCAIS_DEFAULTS: LocalDefault[] = [
  { nome: "Sala Azul", capacidade: 20 },
  { nome: "Sala Arco-Íris", capacidade: 25 },
  { nome: "Sala Dourada", capacidade: 15 },
  { nome: "Parque Trampolins", capacidade: 30 },
  { nome: "Sala Multiusos", capacidade: 40 },
];
