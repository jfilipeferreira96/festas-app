import type { Request, Response } from "express";
import { localService } from "../services/local.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "local.notFound",
  HAS_RESERVAS: "local.hasReservas",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  HAS_RESERVAS: 409,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Local",
});

export const listarLocais = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const apenasAtivos = req.query.activo === "true";
    const locais = apenasAtivos
      ? await localService.listActive()
      : await localService.list();
    res.status(200).json(locais);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterLocal = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const local = await localService.getById(id);
    res.status(200).json(local);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarLocal = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { nome, capacidade, activo } = req.body;
    const local = await localService.create({ nome, capacidade, activo });
    res.status(201).json(local);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarLocal = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { nome, capacidade, activo } = req.body;
    const local = await localService.update(id, { nome, capacidade, activo });
    res.status(200).json(local);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarLocal = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await localService.delete(id);
    res.status(200).json({ message: req.t("local.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};
