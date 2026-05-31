import type { Request, Response } from "express";
import { etapaFestaService } from "../services/etapaFesta.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "etapaFesta.notFound",
  NOME_REQUIRED: "etapaFesta.nomeRequired",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  NOME_REQUIRED: 400,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "EtapaFesta",
});

export const listarEtapas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const etapas = await etapaFestaService.list();
    res.status(200).json(etapas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterEtapa = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const etapa = await etapaFestaService.getById(id);
    res.status(200).json(etapa);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarEtapa = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { nome, descricao, ordem, icone } = req.body;
    const etapa = await etapaFestaService.create({
      nome,
      descricao,
      ordem,
      icone,
    });
    res.status(201).json(etapa);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarEtapa = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { nome, descricao, ordem, icone, activo } = req.body;
    const etapa = await etapaFestaService.update(id, {
      nome,
      descricao,
      ordem,
      icone,
      activo,
    });
    res.status(200).json(etapa);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarEtapa = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await etapaFestaService.delete(id);
    res.status(200).json({ message: req.t("etapaFesta.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};