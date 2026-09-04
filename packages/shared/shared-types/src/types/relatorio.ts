// ===================================
// Relatório - Types
// ===================================

export interface LinhaRelatorio {
  descricao: string;
  quantidade: number;
  totalCriancas: number;
  valorNumerario: number;
  valorMultibanco: number;
  valorTransferencia: number;
  valorMbway: number;
  valorCartao: number;
  valorOutro: number;
}

export interface SecaoRelatorio {
  titulo: string;
  linhas: LinhaRelatorio[];
  total: LinhaRelatorio;
  linhasInformativas?: LinhaRelatorio[];
}

export interface RelatorioFinanceiro {
  dataInicio: string;
  dataFim: string;
  festas: SecaoRelatorio;
  entradasLivres: SecaoRelatorio;
  outros: SecaoRelatorio;
  ajustes: SecaoRelatorio;
  totalGeral: LinhaRelatorio;
}
