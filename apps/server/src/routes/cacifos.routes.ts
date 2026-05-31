import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarCacifos,
  obterCacifo,
  getDisponiveis,
  marcarOcupado,
  libertarCacifo,
  marcarReservado,
  actualizarCacifo,
  atribuirCacifos,
  getContadores,
} from "../controllers/cacifo.controller";

const router = Router();

router.get("/", requireAuth, listarCacifos);
router.get("/contadores", requireAuth, getContadores);
router.get("/disponiveis", requireAuth, getDisponiveis);
router.get("/:id", requireAuth, obterCacifo);
router.patch("/:id/ocupado", requireAuth, marcarOcupado);
router.patch("/:id/libertar", requireAuth, libertarCacifo);
router.patch("/:id/reservado", requireAuth, marcarReservado);
router.patch("/:id", requireAuth, actualizarCacifo);
router.post("/atribuir", requireAuth, atribuirCacifos);

export default router;