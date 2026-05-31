// ===================================
// Campanha — Types for marketing campaign management
// ===================================

export type TipoCampanha = "EMAIL" | "SMS";

export type EstadoCampanha = "RASCUNHO" | "AGENDADA" | "ENVIADA" | "CANCELADA";

export interface Campanha {
  id: string;
  tipo: TipoCampanha;
  estado: EstadoCampanha;
  assunto?: string;
  mensagem: string;
  segmentoId?: string;
  agendadaPara?: string;
  enviadaEm?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnvioCampanha {
  id: string;
  campanhaId: string;
  contactoId: string;
  enviadoEm: string;
  aberto: boolean;
  abertoEm?: string;
}

export interface Segmento {
  id: string;
  nome: string;
  descricao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsletterContacto {
  id: string;
  optOut: boolean;
  clienteId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactoSegmento {
  id: string;
  contactoId: string;
  segmentoId: string;
}
