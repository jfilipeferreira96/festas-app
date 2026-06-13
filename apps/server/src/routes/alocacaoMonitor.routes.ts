import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { requireFuncao } from "../middlewares/roleMiddleware";
import {
  listarAlocacoes,
  obterAlocacao,
  criarAlocacao,
  atualizarAlocacao,
  eliminarAlocacao,
} from "../controllers/alocacaoMonitor.controller";

const router = Router();

// Leitura — qualquer utilizador autenticado (monitores podem ver onde estão)
router.get("/", requireAuth, listarAlocacoes);
router.get("/:id", requireAuth, obterAlocacao);

// Escrita — apenas Administrador e Gestor
router.post("/", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), criarAlocacao);
router.put("/:id", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), atualizarAlocacao);
router.delete("/:id", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), eliminarAlocacao);

export default router;
