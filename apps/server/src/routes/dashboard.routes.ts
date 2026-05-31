import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  getKPIs,
  getFestasEmCurso,
  getProximasFestas,
  getAniversarioEmBreve,
} from "../controllers/dashboard.controller";

const router = Router();

router.get("/kpis", requireAuth, getKPIs);
router.get("/festas-em-curso", requireAuth, getFestasEmCurso);
router.get("/proximas-festas", requireAuth, getProximasFestas);
router.get("/aniversario-em-breve", requireAuth, getAniversarioEmBreve);

export default router;
