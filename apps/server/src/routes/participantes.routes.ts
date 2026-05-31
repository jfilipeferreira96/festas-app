import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarParticipantes,
  adicionarParticipante,
  confirmarPresenca,
  removerParticipante,
} from "../controllers/participante.controller";

const router = Router();

router.get("/", requireAuth, listarParticipantes);
router.post("/", requireAuth, adicionarParticipante);
router.patch("/:id/presenca", requireAuth, confirmarPresenca);
router.delete("/:id", requireAuth, removerParticipante);

export default router;