import type { Request, Response } from "express";
import { monitorService } from "../services/monitor.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "monitor.notFound",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Monitor",
});

export const listarMonitores = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const apenasAtivos = req.query.ativos === "true";
    const monitores = apenasAtivos
      ? await monitorService.listActive()
      : await monitorService.list();
    res.status(200).json(monitores);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterMonitor = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const monitor = await monitorService.getById(id);
    res.status(200).json(monitor);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarMonitor = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { nome, contacto, activo } = req.body;
    const monitor = await monitorService.create({
      nome,
      contacto,
      activo,
    });
    res.status(201).json(monitor);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarMonitor = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { nome, contacto, activo } = req.body;
    const monitor = await monitorService.update(id, {
      nome,
      contacto,
      activo,
    });
    res.status(200).json(monitor);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarMonitor = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await monitorService.delete(id);
    res.status(200).json({ message: req.t("monitor.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};
