import type { Request, Response } from "express";
import { cacifoService } from "../services/cacifo.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "cacifo.notFound",
  ALREADY_OCCUPIED: "cacifo.alreadyOccupied",
  CANNOT_RELEASE_FREE: "cacifo.cannotReleaseFree",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  ALREADY_OCCUPIED: 409,
  CANNOT_RELEASE_FREE: 400,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Cacifo",
});

export const listarCacifos = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const filtros = {
      estado: req.query.estado as string | undefined,
      reservaId: req.query.reservaId as string | undefined,
    };
    const cacifos = await cacifoService.list(filtros);
    res.status(200).json(cacifos);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterCacifo = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const cacifo = await cacifoService.getById(id);
    res.status(200).json(cacifo);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getDisponiveis = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const cacifos = await cacifoService.getDisponiveis();
    res.status(200).json(cacifos);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const marcarOcupado = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { reservaId, notas, criancas } = req.body;
    const cacifo = await cacifoService.marcarOcupado(id, reservaId, { notas, criancas });
    res.status(200).json(cacifo);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const libertarCacifo = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const cacifo = await cacifoService.libertar(id);
    res.status(200).json(cacifo);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const marcarReservado = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { reservaId, notas, criancas } = req.body;
    const cacifo = await cacifoService.marcarReservado(id, reservaId, { notas, criancas });
    res.status(200).json(cacifo);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const actualizarCacifo = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { notas, criancas } = req.body;
    const cacifo = await cacifoService.actualizarCacifo(id, { notas, criancas });
    res.status(200).json(cacifo);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atribuirCacifos = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { reservaId, cacifos } = req.body;
    const results = await cacifoService.atribuirCacifos(reservaId, cacifos);
    res.status(200).json(results);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getContadores = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const contadores = await cacifoService.getContadores();
    res.status(200).json(contadores);
  } catch (error) {
    handleError(error, req, res);
  }
};