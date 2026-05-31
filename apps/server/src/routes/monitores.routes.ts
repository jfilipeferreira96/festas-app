import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarMonitores,
  obterMonitor,
  criarMonitor,
  atualizarMonitor,
  eliminarMonitor,
} from "../controllers/monitor.controller";

const router = Router();

router.get("/", requireAuth, listarMonitores);
router.get("/:id", requireAuth, obterMonitor);
router.post("/", requireAuth, criarMonitor);
router.put("/:id", requireAuth, atualizarMonitor);
router.delete("/:id", requireAuth, eliminarMonitor);

export default router;
