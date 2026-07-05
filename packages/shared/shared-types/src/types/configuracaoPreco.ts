// ===================================
// Configuração de Preços (singleton global)
// ===================================
// Preço POR CRIANÇA (festa); Entrada Livre = preço por hora.
// Mínimos de crianças por nº de aniversariantes (1→10, 2→15, 3→20).

export interface MinimoCriancasPorAniversariante {
  aniversariantes: number;
  minimo: number;
}

export interface ConfiguracaoPreco {
  id: string;
  // Preço POR CRIANÇA (festa)
  precoCriancaSemana: number;
  precoCriancaFimSemana: number;
  // Entrada livre (preço por hora — linear, legado)
  precoEntradaHoraSemana: number;
  precoEntradaHoraFimSemana: number;
  // Entrada livre (tarifário por escalão — aplica-se a todos os dias)
  precoEntrada1h: number;
  precoEntrada2h: number;
  precoEntradaHoraAdicional: number;
  // Mínimos de crianças por nº de aniversariantes
  minimosCriancasPorAniversariante: MinimoCriancasPorAniversariante[];
  // Meias
  precoMeias: number;
  // Excesso de tempo
  precoExcessoFixo: number;
  // Caução por defeito (valor sugerido ao criar reserva — sobrescrevível)
  caucaoDefault: number;
  // Lanche em entrada livre (suplemento por pessoa quando temLanche = true)
  precoLancheEntrada: number;
  // Valor/hora default para monitores (fallback quando monitor não tem valor individual)
  valorHoraMonitorDefault: number | null;
  // Durações default
  duracaoDefaultFestaMin: number;
  duracaoExcessoBlocoMin: number;
  createdAt: string;
  updatedAt: string;
}

export interface AtualizarConfiguracaoPrecoDTO {
  precoCriancaSemana?: number;
  precoCriancaFimSemana?: number;
  precoEntradaHoraSemana?: number;
  precoEntradaHoraFimSemana?: number;
  precoEntrada1h?: number;
  precoEntrada2h?: number;
  precoEntradaHoraAdicional?: number;
  minimosCriancasPorAniversariante?: MinimoCriancasPorAniversariante[];
  precoMeias?: number;
  precoExcessoFixo?: number;
  caucaoDefault?: number;
  precoLancheEntrada?: number;
  valorHoraMonitorDefault?: number | null;
  duracaoDefaultFestaMin?: number;
  duracaoExcessoBlocoMin?: number;
}
