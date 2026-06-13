import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import { getRelatorioFinanceiro } from "../controllers/relatorio.controller";

const router = Router();

router.get("/financeiro", requireAuth, getRelatorioFinanceiro);

export default router;