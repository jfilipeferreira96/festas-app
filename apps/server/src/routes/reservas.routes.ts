import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarReservas,
  obterReserva,
  criarReserva,
  atualizarReserva,
  atualizarEstadoReserva,
  eliminarReserva,
  getReservasAtivas,
  getReservasConcluidas,
  iniciarReserva,
  finalizarReserva,
  alocarMonitor,
  removerMonitor,
  toggleEtapa,
  removerEtapa,
  marcarEtapasConcluidas,
} from "../controllers/reserva.controller";

const router = Router();

// CRUD
router.get("/", requireAuth, listarReservas);
router.get("/ativas", requireAuth, getReservasAtivas);
router.get("/concluidas", requireAuth, getReservasConcluidas);
router.get("/:id", requireAuth, obterReserva);
router.post("/", requireAuth, criarReserva);
router.put("/:id", requireAuth, atualizarReserva);
router.patch("/:id/estado", requireAuth, atualizarEstadoReserva);
router.delete("/:id", requireAuth, eliminarReserva);

router.post("/:id/iniciar", requireAuth, iniciarReserva);
router.post("/:id/finalizar", requireAuth, finalizarReserva);
router.post("/:id/monitores", requireAuth, alocarMonitor);
router.delete("/:id/monitores", requireAuth, removerMonitor);
router.patch("/:id/etapas", requireAuth, toggleEtapa);
router.delete("/:id/etapas/:etapaId", requireAuth, removerEtapa);
router.post("/:id/etapas/concluir-todas", requireAuth, marcarEtapasConcluidas);

export default router;
