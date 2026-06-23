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
  // Entrada livre (preço por hora)
  precoEntradaHoraSemana: number;
  precoEntradaHoraFimSemana: number;
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
  minimosCriancasPorAniversariante?: MinimoCriancasPorAniversariante[];
  precoMeias?: number;
  precoExcessoFixo?: number;
  caucaoDefault?: number;
  precoLancheEntrada?: number;
  duracaoDefaultFestaMin?: number;
  duracaoExcessoBlocoMin?: number;
}
