import { Router } from "express";
import { requireAuth } from "../middlewares/authMiddleware";
import {
  listarExtras,
  obterExtra,
  criarExtra,
  atualizarExtra,
  eliminarExtra,
} from "../controllers/extra.controller";

const router = Router();

router.get("/", requireAuth, listarExtras);
router.get("/:id", requireAuth, obterExtra);
router.post("/", requireAuth, criarExtra);
router.put("/:id", requireAuth, atualizarExtra);
router.delete("/:id", requireAuth, eliminarExtra);

export default router;
