import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarCampanhas,
  obterCampanha,
  criarCampanha,
  atualizarCampanha,
  enviarCampanha,
  getMetricas,
  eliminarCampanha,
} from "../controllers/campanha.controller";

const router = Router();

router.get("/", requireAuth, listarCampanhas);
router.get("/:id", requireAuth, obterCampanha);
router.get("/:id/metricas", requireAuth, getMetricas);
router.post("/", requireAuth, criarCampanha);
router.put("/:id", requireAuth, atualizarCampanha);
router.post("/:id/enviar", requireAuth, enviarCampanha);
router.delete("/:id", requireAuth, eliminarCampanha);

export default router;
