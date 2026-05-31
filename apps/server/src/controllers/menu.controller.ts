import type { Request, Response } from "express";
import { menuService } from "../services/menu.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "menu.notFound",
  ALREADY_EXISTS: "menu.alreadyExists",
  RESERVA_NOT_FOUND: "menu.reservaNotFound",
  RESERVA_IN_PROGRESS: "menu.reservaInProgress",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  RESERVA_NOT_FOUND: 404,
  RESERVA_IN_PROGRESS: 400,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Menu",
});

export const obterMenu = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const reservaId = req.params.reservaId as string;
    const menu = await menuService.getByReservaId(reservaId);
    res.status(200).json(menu);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarMenu = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { reservaId, nome, preco, notas } = req.body;
    const menu = await menuService.create({ reservaId, nome, preco, notas });
    res.status(201).json({ message: req.t("menu.savedSuccessfully"), data: menu });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarMenu = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const reservaId = req.params.reservaId as string;
    const { nome, preco, notas } = req.body;
    const menu = await menuService.update(reservaId, { nome, preco, notas });
    res.status(200).json({ message: req.t("menu.updatedSuccessfully"), data: menu });
  } catch (error) {
    handleError(error, req, res);
  }
};