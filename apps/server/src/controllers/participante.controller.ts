import type { Request, Response } from "express";
import { participanteService } from "../services/participante.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "participante.notFound",
  MAX_PARTICIPANTES: "participante.maxParticipantes",
  RESERVA_NOT_FOUND: "participante.reservaNotFound",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  MAX_PARTICIPANTES: 400,
  RESERVA_NOT_FOUND: 404,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Participante",
});

export const listarParticipantes = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const reservaId = req.query.reservaId as string;
    if (!reservaId) return res.status(400).json({ error: "reservaId é obrigatório" });

    const participantes = await participanteService.listByReserva(reservaId);
    res.status(200).json(participantes);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const adicionarParticipante = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { reservaId, nome } = req.body;
    const participante = await participanteService.adicionarParticipante(reservaId, nome);
    res.status(201).json({ message: req.t("participante.added"), data: participante });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const confirmarPresenca = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { presenca } = req.body as { presenca: boolean };
    const participante = await participanteService.confirmarPresenca(id, presenca ?? true);
    res.status(200).json({ message: req.t("participante.confirmed"), data: participante });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const marcarTodosPresenca = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { reservaId, presenca } = req.body as { reservaId: string; presenca: boolean };
    if (!reservaId) return res.status(400).json({ error: "reservaId é obrigatório" });

    const participantes = await participanteService.marcarTodosPresenca(reservaId, presenca ?? true);
    res.status(200).json({ message: req.t("participante.confirmed"), data: participantes });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const removerParticipante = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await participanteService.removerParticipante(id);
    res.status(200).json({ message: req.t("participante.removed") });
  } catch (error) {
    handleError(error, req, res);
  }
};