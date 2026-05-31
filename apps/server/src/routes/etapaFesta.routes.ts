import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarEtapas,
  obterEtapa,
  criarEtapa,
  atualizarEtapa,
  eliminarEtapa,
} from "../controllers/etapaFesta.controller";

const router = Router();

router.get("/", requireAuth, listarEtapas);
router.get("/:id", requireAuth, obterEtapa);
router.post("/", requireAuth, criarEtapa);
router.put("/:id", requireAuth, atualizarEtapa);
router.delete("/:id", requireAuth, eliminarEtapa);

export default router;