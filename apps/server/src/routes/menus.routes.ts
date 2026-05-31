import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  obterMenu,
  criarMenu,
  atualizarMenu,
} from "../controllers/menu.controller";

const router = Router();

router.get("/:reservaId", requireAuth, obterMenu);
router.post("/", requireAuth, criarMenu);
router.put("/:reservaId", requireAuth, atualizarMenu);

export default router;
