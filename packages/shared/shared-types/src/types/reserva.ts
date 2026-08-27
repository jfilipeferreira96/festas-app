// ===================================
// Reserva — Types for reservation/party management
// ===================================

export type EstadoReserva = "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA" | "CANCELADA";

export type MetodoPagamento = "DINHEIRO" | "MULTIBANCO" | "MBWAY" | "TRANSFERENCIA" | "CARTAO" | "OUTRO";

export type EstadoCaucao = "PAGA" | "NAO_PAGA" | "PAGA_NO_DIA";

export type TipoBolo = "PAIS_TRAZEM" | "NOSSO_1KG" | "NOSSO_2KG" | "BOLO_ARTISTICO" | "A_DECIDIR";

export interface Reserva {
  id: string;
  data: string;
  horario: string;
  horaLanche?: string;
  salaLancheId?: string;
  salaLancheNome?: string;
  duracaoMinutos: number;
  numCriancas: number;
  notas?: string;
  estado: EstadoReserva;
  clienteId: string;
  localId: string;

  // Runtime fields (filled when estado = EM_CURSO)
  inicioEm?: string;
  fimPrevisto?: string;
  fimReal?: string;
  cacifosHistorico?: CacifoHistoricoEntry[];

  // Excesso (filled when finalizing)
  excessoMinutos?: number;
  custoExcesso?: number;
  custoTotalFinal?: number;
  pagoExcesso?: boolean;

  // Festa fields
  tema?: string;
  previsaoCriancas?: number;
  cor?: string;
  bolo?: TipoBolo;
  boloTema?: string;
  boloQuantidade?: number;
  numCriancasConfirmadas?: number;

  // Notas por equipa
  notasCacifos?: string;
  notasLanche?: string;

  // Estado dos cacifos (controlo ao nível da festa)
  cacifosChamado?: boolean;
  cacifosConcluido?: boolean;

  // Observações
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;

  // Pagamento
  metodoPagamento?: MetodoPagamento;
  valorPago?: number;
  pago: boolean;
  referenciaPagamento?: string;

  // Pagamento dividido (até 2 métodos — restante pode ser pago de outra forma)
  metodoPagamento2?: MetodoPagamento;
  valorPago2?: number;

  // Caução
  caucao: EstadoCaucao;
  valorCaucao?: number;

  // Desconto
  descontoPercentagem?: number;
  descontoMotivo?: string;

  // Meias (compra obrigatória no parque)
  meiasQuantidade?: number;
  meiasPrecoUnit?: number;

  // Preço por criança (cálculo aplicado)
  precoCriancaAplicado?: number;
  minimoCriancas?: number;

  createdAt: string;
  updatedAt: string;
}

export interface CacifoHistoricoEntry {
  numero: number;
  estado: string;
  notas?: string;
  criancas?: string;
}

export interface ReservaExtra {
  id: string;
  reservaId: string;
  extraId: string;
  quantidade: number;
  textoPersonalizado?: string;
  /** Extra entregue/prestado no dia da festa (check na tabela de festas). */
  concluido?: boolean;
}

export interface ReservaMonitor {
  id: string;
  reservaId: string;
  monitorId: string;
}

export interface ReservaEtapa {
  id: string;
  reservaId: string;
  etapaId: string;
  concluida: boolean;
  concluidaEm?: string;
}

export interface ReservaAniversariante {
  id: string;
  reservaId: string;
  aniversarianteId: string;
}

export interface CriarReservaDTO {
  data: string;
  horario: string;
  horaLanche?: string;
  salaLancheId?: string;
  duracaoMinutos: number;
  numCriancas?: number;
  notas?: string;
  clienteId: string;
  localId: string;

  // Festa fields
  tema?: string;
  previsaoCriancas?: number;
  cor?: string;
  bolo?: TipoBolo;
  boloTema?: string;
  boloQuantidade?: number;
  numCriancasConfirmadas?: number;

  // Notas por equipa
  notasCacifos?: string;
  notasLanche?: string;

  // Observações
  observacoesGerais?: string;
  observacoesLesoes?: string;
  observacoesBrindes?: string;
  outrosExtras?: string;

  // Pagamento
  metodoPagamento?: MetodoPagamento;
  valorPago?: number;
  pago?: boolean;
  referenciaPagamento?: string;

  // Pagamento dividido (até 2 métodos)
  metodoPagamento2?: MetodoPagamento;
  valorPago2?: number;

  // Caução
  caucao?: EstadoCaucao;
  valorCaucao?: number;

  // Desconto
  descontoPercentagem?: number;
  descontoMotivo?: string;

  // Meias
  meiasQuantidade?: number;

  // Related data
  extras?: { extraId: string; quantidade: number; textoPersonalizado?: string }[];
  aniversariantes?: { aniversarianteId: string }[];
}