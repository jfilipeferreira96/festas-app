import { Router } from "express";
import dashboardRoutes from "./dashboard.routes";
import reservasRoutes from "./reservas.routes";
import cacifosRoutes from "./cacifos.routes";
import menusRoutes from "./menus.routes";
import locaisRoutes from "./locais.routes";
import clientesRoutes from "./clientes.routes";
import monitoresRoutes from "./monitores.routes";
import extrasRoutes from "./extras.routes";
import etapaFestaRoutes from "./etapaFesta.routes";
import campanhasRoutes from "./campanhas.routes";
import utilizadoresRoutes from "./utilizadores.routes";
import uploadRoutes from "./upload.routes";
import permissoesRoutes from "./permissoes.routes";
import configuracaoCacifoRoutes from "./configuracaoCacifo.routes";
import participantesRoutes from "./participantes.routes";
import entradaLivreRoutes from "./entradaLivre.routes";
import alocacaoMonitorRoutes from "./alocacaoMonitor.routes";
import relatorioRoutes from "./relatorio.routes";

const router = Router();

// Dashboard
router.use("/dashboard", dashboardRoutes);

// Reservas (unified with Festas)
router.use("/reservas", reservasRoutes);

// Cacifos
router.use("/cacifos", cacifosRoutes);

// Menus
router.use("/menus", menusRoutes);

// Locais / Salas
router.use("/locais", locaisRoutes);

// Clientes
router.use("/clientes", clientesRoutes);

// Monitores
router.use("/monitores", monitoresRoutes);

// Extras
router.use("/extras", extrasRoutes);

// Etapas de Festa
router.use("/etapas-festa", etapaFestaRoutes);

// Campanhas (Newsletter / SMS)
router.use("/campanhas", campanhasRoutes);

// Utilizadores
router.use("/utilizadores", utilizadoresRoutes);

// Upload
router.use("/upload", uploadRoutes);

// Permissões (RBAC)
router.use("/permissoes", permissoesRoutes);

// Configuração de Cacifos
router.use("/configuracoes/cacifos", configuracaoCacifoRoutes);

// Participantes
router.use("/participantes", participantesRoutes);

// Entradas Livres (Open Play)
router.use("/entradas-livres", entradaLivreRoutes);

// Alocação de Monitores (escalação por dia + intervalo horário)
router.use("/alocacoes-monitor", alocacaoMonitorRoutes);

// Relatórios (Financeiro)
router.use("/relatorios", relatorioRoutes);

export default router;
