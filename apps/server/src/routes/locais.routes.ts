import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarLocais,
  obterLocal,
  criarLocal,
  atualizarLocal,
  eliminarLocal,
} from "../controllers/local.controller";

const router = Router();

router.get("/", requireAuth, listarLocais);
router.get("/:id", requireAuth, obterLocal);
router.post("/", requireAuth, criarLocal);
router.put("/:id", requireAuth, atualizarLocal);
router.delete("/:id", requireAuth, eliminarLocal);

export default router;
