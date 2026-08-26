// ===================================
// Lanche — vista de lanches a preparar + notas/alergias
// ===================================
// Usado pela conta LANCHE para saber o que preparar e registar alergias.

import type { Menu } from "./menu";

export type EstadoLanche = "NAO_INICIADO" | "A_DECORRER" | "TERMINADO";

export interface LancheFesta {
  reservaId: string;
  tipo: "FESTA";
  nomeFesta: string; // nome do(s) aniversariante(s)
  data: string;
  horario: string;
  horaLanche?: string;
  localNome: string;
  salaLancheNome?: string;
  cor?: string;
  numCriancas: number;
  previsaoCriancas?: number;
  numConfirmados?: number;
  idadeAniversariante?: number;
  menu?: Menu;
  notasLanche?: string;
  notasLancheReserva?: string; // notas do lanche vindas da Reserva (escritas na marcação)
  notasCacifos?: string;       // notas de cacifos vindas da Reserva
  itensLanche?: unknown;
  observacoesLesoes?: string;
  observacoesCacifo?: string;
  extrasNomes?: string[];
  extrasLancheNomes?: string[];
  estadoLanche: EstadoLanche;
}

export interface LancheEntradaLivre {
  entradaLivreId: string;
  tipo: "ENTRADA_LIVRE";
  encarregadoNome: string;
  inicioEm: string;
  horaLanche?: string;
  localNome: string;
  cor?: string;
  temLanche: boolean;
  criancas: { nome: string; idade?: number; querLanche?: boolean }[];
  observacoesLesoes?: string;
  estadoLanche: EstadoLanche;
}

export type LancheDoDia = LancheFesta | LancheEntradaLivre;

export interface AtualizarNotasLancheDTO {
  reservaId: string;
  notasLanche?: string;
  itensLanche?: unknown;
  observacoesLesoes?: string;
  horaLanche?: string | null;
}

export interface AtualizarLancheEntradaDTO {
  entradaLivreId: string;
  estadoLanche?: EstadoLanche;
  observacoesLesoes?: string;
}
