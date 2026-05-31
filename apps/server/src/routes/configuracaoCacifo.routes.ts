import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { requireFuncao } from "../middlewares/roleMiddleware";
import { getConfig, inicializar, updateConfig } from "../controllers/configuracaoCacifo.controller";

const router = Router();

router.get("/", requireAuth, getConfig);
router.post("/inicializar", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), inicializar);
router.put("/", requireAuth, requireFuncao("ADMINISTRADOR", "GESTOR"), updateConfig);

export default router;