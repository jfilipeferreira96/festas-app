import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { requireFuncao } from "../middlewares/roleMiddleware";
import {
  listarUtilizadores,
  obterUtilizador,
  criarUtilizador,
  atualizarFuncao,
  atualizarActivo,
  eliminarUtilizador,
} from "../controllers/utilizador.controller";

const router = Router();

// List all users (ADMINISTRADOR, GESTOR only)
router.get("/", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), listarUtilizadores);

// Get user by ID (ADMINISTRADOR, GESTOR only)
router.get("/:id", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), obterUtilizador);

// Create user (ADMINISTRADOR only)
router.post("/", requireAuth, requireFuncao("ADMINISTRADOR"), criarUtilizador);

// Update user role (ADMINISTRADOR only)
router.patch("/:id/funcao", requireAuth, requireFuncao("ADMINISTRADOR"), atualizarFuncao);

// Update user active status (ADMINISTRADOR only)
router.patch("/:id/activo", requireAuth, requireFuncao("ADMINISTRADOR"), atualizarActivo);

// Delete user (ADMINISTRADOR only)
router.delete("/:id", requireAuth, requireFuncao("ADMINISTRADOR"), eliminarUtilizador);

export default router;