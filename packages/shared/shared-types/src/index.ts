// ===================================
// @saas/shared-types — Gestão de Festas Infantis
// ===================================

// Types
export type { FuncaoUtilizador, Utilizador } from "./types/utilizador";
export type { Cliente, CriarClienteDTO, ClienteWithAniversariantes } from "./types/cliente";
export type { Aniversariante } from "./types/aniversariante";
export type { EstadoReserva, MetodoPagamento, EstadoCaucao, Reserva, ReservaExtra, ReservaMonitor, ReservaEtapa, ReservaAniversariante, CriarReservaDTO, CacifoHistoricoEntry } from "./types/reserva";
export type { EstadoCacifo, Cacifo, ConfiguracaoCacifo, UpdateConfiguracaoCacifoDTO } from "./types/cacifo";
export type { CategoriaItem, Menu } from "./types/menu";
export type { Participante, CriarParticipanteDTO } from "./types/participante";
export type { Local } from "./types/local";
export type { Monitor, MonitorLocal } from "./types/monitor";
export type { AlocacaoMonitor, CriarAlocacaoMonitorDTO, AtualizarAlocacaoMonitorDTO } from "./types/alocacaoMonitor";
export type { Extra, ExtraLocal } from "./types/extra";
export type { TipoCampanha, EstadoCampanha, Campanha, EnvioCampanha, Segmento, NewsletterContacto, ContactoSegmento } from "./types/campanha";
export type { EtapaFesta, ReservaEtapa as ReservaEtapaWithDetails } from "./types/etapaFesta";
export type { Permissao, PermissaoInput } from "./types/permissao";
export type { AuditLog } from "./types/audit";
export type { CriancaInput, EntradaLivre, EntradaLivreExtraItem, CriarEntradaLivreDTO, ConfiguracaoEntradaLivre } from "./types/entradaLivre";
