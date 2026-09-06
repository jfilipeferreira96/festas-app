// ===================================
// @saas/shared-types - Gestão de Festas Infantis
// ===================================

// Types
export type { FuncaoUtilizador, Utilizador } from "./types/utilizador";
export type { Cliente, CriarClienteDTO, ClienteWithAniversariantes } from "./types/cliente";
export type { Aniversariante } from "./types/aniversariante";
export type { EstadoReserva, MetodoPagamento, EstadoCaucao, TipoBolo, Reserva, ReservaExtra, ReservaMonitor, ReservaEtapa, ReservaAniversariante, CriarReservaDTO, CacifoHistoricoEntry } from "./types/reserva";
export type { Pagamento, CriarPagamentoDTO } from "./types/pagamento";
export type { EstadoCacifo, Cacifo, ConfiguracaoCacifo, UpdateConfiguracaoCacifoDTO } from "./types/cacifo";
export type { CategoriaItem, Menu } from "./types/menu";
export type { Local } from "./types/local";
export type { SalaLanche, CriarSalaLancheDTO } from "./types/salaLanche";
export type { Monitor, CriarMonitorDTO, AtualizarMonitorDTO, HorasMonitorResult } from "./types/monitor";
export type { AlocacaoMonitor, CriarAlocacaoMonitorDTO, AtualizarAlocacaoMonitorDTO } from "./types/alocacaoMonitor";
export type { Extra, ExtraLocal, BaseCobranca } from "./types/extra";
export type { TipoCampanha, EstadoCampanha, Campanha, EnvioCampanha, Segmento, NewsletterContacto, ContactoSegmento } from "./types/campanha";
export type { EtapaFesta, ReservaEtapa as ReservaEtapaWithDetails } from "./types/etapaFesta";
export type { Modulo, NivelAcesso, MatrizPermissoes, Permissao } from "./types/permissao";
export type { AuditLog } from "./types/audit";
export type { CriancaInput, EntradaLivre, EntradaLivreExtraItem, CriarEntradaLivreDTO } from "./types/entradaLivre";
export type { LinhaRelatorio, SecaoRelatorio, RelatorioFinanceiro } from "./types/relatorio";
export type { TipoExcecaoCalendario, ExcecaoCalendario, CriarExcecaoCalendarioDTO } from "./types/excecaoCalendario";
export type { SlotHorario, CriarSlotHorarioDTO } from "./types/slotHorario";
export type { EstadoLanche, LancheFesta, LancheEntradaLivre, LancheDoDia, AtualizarNotasLancheDTO, AtualizarLancheEntradaDTO } from "./types/lanche";
export type { MinimoCriancasPorAniversariante, ConfiguracaoPreco, AtualizarConfiguracaoPrecoDTO } from "./types/configuracaoPreco";
export type { NotaDiaria, UpsertNotaDiariaDTO } from "./types/notaDiaria";
