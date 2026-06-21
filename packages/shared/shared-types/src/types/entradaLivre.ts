// ===================================
// Entrada Livre — Types
// ===================================

export interface CriancaInput {
  nome: string;
  idade?: number;
}

export interface EntradaLivre {
  id: string;
  criancas: CriancaInput[];
  encarregadoNome: string;
  encarregadoTelefone: string;
  encarregadoEmail?: string;
  duracaoMinutos: number;
  custoHora: number;
  custoTotal: number;
  custoExcesso?: number;
  custoTotalFinal?: number;
  inicioEm: string;
  fimPrevisto: string;
  fimReal?: string;
  excessoMinutos: number;
  localId: string;
  local?: { id: string; nome: string };
  estado: "ATIVA" | "CONCLUIDA" | "CANCELADA";
  metodoPagamento?: string;
  pago: boolean;
  pagoExcesso: boolean;
  // Pagamento dividido (até 2 métodos)
  metodoPagamento2?: string;
  valorPago2?: number;
  // Meias
  meiasQuantidade?: number;
  meiasPrecoUnit?: number;
  cacifoId?: string;
  cacifo?: { id: string; numero: number; nome?: string };
  observacoes?: string;
  observacoesLesoes?: string;
  extras: EntradaLivreExtraItem[];
  createdAt: string;
  updatedAt: string;
}

export interface EntradaLivreExtraItem {
  id: string;
  entradaLivreId: string;
  extraId: string;
  quantidade: number;
  textoPersonalizado?: string;
  extra: { id: string; nome: string; precoUnitario: number };
}

export interface CriarEntradaLivreDTO {
  criancas: CriancaInput[];
  encarregadoNome: string;
  encarregadoTelefone: string;
  encarregadoEmail?: string;
  duracaoMinutos: number;
  localId: string;
  custoTotal?: number;
  metodoPagamento?: string;
  pago?: boolean;
  cacifoId?: string;
  extrasIds?: string[];
  observacoes?: string;
  observacoesLesoes?: string;
  // Pagamento dividido (até 2 métodos)
  metodoPagamento2?: string;
  valorPago2?: number;
  // Meias
  meiasQuantidade?: number;
}
