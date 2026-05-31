import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarClientes,
  obterCliente,
  criarCliente,
  atualizarCliente,
  eliminarCliente,
} from "../controllers/cliente.controller";

const router = Router();

router.get("/", requireAuth, listarClientes);
router.get("/:id", requireAuth, obterCliente);
router.post("/", requireAuth, criarCliente);
router.put("/:id", requireAuth, atualizarCliente);
router.delete("/:id", requireAuth, eliminarCliente);

export default router;
