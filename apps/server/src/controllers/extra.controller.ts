import type { Request, Response } from "express";
import { extraService } from "../services/extra.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "extra.notFound",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Extra",
});

export const listarExtras = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const extras = await extraService.list();
    res.status(200).json(extras);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterExtra = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const extra = await extraService.getById(id);
    res.status(200).json(extra);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarExtra = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { nome, descricao, precoUnitario, icone, categoria, subcategoria, requerTexto, locaisIds } = req.body;
    const extra = await extraService.create({
      nome,
      descricao,
      precoUnitario,
      icone,
      categoria,
      subcategoria,
      requerTexto,
      locaisIds: locaisIds || [],
    });
    res.status(201).json(extra);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarExtra = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { nome, descricao, precoUnitario, icone, categoria, subcategoria, requerTexto, locaisIds } = req.body;
    const extra = await extraService.update(id, {
      nome,
      descricao,
      precoUnitario,
      icone,
      categoria,
      subcategoria,
      requerTexto,
      locaisIds,
    });
    res.status(200).json(extra);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarExtra = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await extraService.delete(id);
    res.status(200).json({ message: req.t("extra.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};
