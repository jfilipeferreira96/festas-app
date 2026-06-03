import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarEntradas,
  obterEntrada,
  criarEntrada,
  concluirEntrada,
  cancelarEntrada,
  atualizarPagamento,
  atualizarEntrada,
  eliminarEntrada,
  getContadores,
  getConfiguracao,
  listarConfiguracoes,
  upsertConfiguracao,
} from "../controllers/entradaLivre.controller";

const router = Router();

// ── Configuração (antes de /:id) ─────────────────
router.get("/configuracao", requireAuth, listarConfiguracoes);
router.get("/configuracao/local/:localId", requireAuth, getConfiguracao);
router.post("/configuracao", requireAuth, upsertConfiguracao);

// ── Contadores ────────────────────────────────────
router.get("/contadores", requireAuth, getContadores);

// ── Entradas Livres ───────────────────────────────
router.get("/", requireAuth, listarEntradas);
router.get("/:id", requireAuth, obterEntrada);
router.post("/", requireAuth, criarEntrada);
router.patch("/:id/concluir", requireAuth, concluirEntrada);
router.patch("/:id/cancelar", requireAuth, cancelarEntrada);
router.patch("/:id/pagamento", requireAuth, atualizarPagamento);
router.patch("/:id", requireAuth, atualizarEntrada);
router.delete("/:id", requireAuth, eliminarEntrada);

export default router;