// ===================================
// Lanche — vista de lanches a preparar + notas/alergias
// ===================================
// Usado pela conta LANCHE para saber o que preparar e registar alergias.

import type { Menu } from "./menu";

export interface LancheFesta {
  reservaId: string;
  tipo: "FESTA";
  nomeFesta: string; // nome do(s) aniversariante(s)
  data: string;
  horario: string;
  localNome: string;
  numCriancas: number;
  previsaoCriancas?: number;
  menu?: Menu;
  notasLanche?: string;
  itensLanche?: unknown;
}

export interface LancheEntradaLivre {
  entradaLivreId: string;
  tipo: "ENTRADA_LIVRE";
  encarregadoNome: string;
  inicioEm: string;
  localNome: string;
  criancas: { nome: string; idade?: number }[];
  observacoesLesoes?: string;
}

export type LancheDoDia = LancheFesta | LancheEntradaLivre;

export interface AtualizarNotasLancheDTO {
  reservaId: string;
  notasLanche?: string;
  itensLanche?: unknown;
}
