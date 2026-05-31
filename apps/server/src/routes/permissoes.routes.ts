import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { requireFuncao } from "../middlewares/roleMiddleware";
import {
  listarPermissoes,
  listarPermissoesPorFuncao,
  atualizarPermissao,
  atualizarPermissoesBulk,
  minhasPermissoes,
  restaurarDefaults,
} from "../controllers/permissoes.controller";

const router = Router();

// Any authenticated user can fetch their own permissions
router.get("/minhas", requireAuth, minhasPermissoes);

// Admin-only permission management routes
router.get("/", requireAuth, requireFuncao("ADMINISTRADOR"), listarPermissoes);
router.get("/:funcao", requireAuth, requireFuncao("ADMINISTRADOR"), listarPermissoesPorFuncao);
router.put("/", requireAuth, requireFuncao("ADMINISTRADOR"), atualizarPermissao);
router.put("/bulk", requireAuth, requireFuncao("ADMINISTRADOR"), atualizarPermissoesBulk);
router.post("/restaurar-defaults", requireAuth, requireFuncao("ADMINISTRADOR"), restaurarDefaults);

export default router;