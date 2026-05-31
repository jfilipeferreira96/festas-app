import type { Request, Response } from "express";
import { campanhaService } from "../services/campanha.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "campanha.notFound",
  SEGMENTO_NOT_FOUND: "campanha.segmentoNotFound",
  CANNOT_EDIT_SENT: "campanha.cannotEditSent",
  ALREADY_SENT: "campanha.alreadySent",
  NO_CONTACTS: "campanha.noContacts",
  CANNOT_DELETE_SENT: "campanha.cannotDeleteSent",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  SEGMENTO_NOT_FOUND: 404,
  CANNOT_EDIT_SENT: 400,
  ALREADY_SENT: 409,
  NO_CONTACTS: 400,
  CANNOT_DELETE_SENT: 400,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Campanha",
});

export const listarCampanhas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const tipo = req.query.tipo as string | undefined;
    const campanhas = await campanhaService.list(tipo);
    res.status(200).json(campanhas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterCampanha = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const campanha = await campanhaService.getById(id);
    res.status(200).json(campanha);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarCampanha = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { tipo, assunto, mensagem, segmentoId, agendadaPara } = req.body;
    const campanha = await campanhaService.create({
      tipo,
      assunto,
      mensagem,
      segmentoId,
      agendadaPara,
    });
    res.status(201).json(campanha);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarCampanha = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { assunto, mensagem, segmentoId, agendadaPara } = req.body;
    const campanha = await campanhaService.update(id, {
      assunto,
      mensagem,
      segmentoId,
      agendadaPara,
    });
    res.status(200).json(campanha);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const enviarCampanha = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const campanha = await campanhaService.enviar(id);
    res.status(200).json(campanha);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getMetricas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const metricas = await campanhaService.getMetricas(id);
    res.status(200).json(metricas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarCampanha = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await campanhaService.delete(id);
    res.status(200).json({ message: req.t("campanha.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};
