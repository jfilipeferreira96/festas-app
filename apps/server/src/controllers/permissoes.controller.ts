import type { Request, Response } from "express";
import { permissoesService } from "../services/permissoes.service";
import { createErrorHandler } from "../utils/errorHandler";
import type { FuncaoUtilizador } from "@prisma/client";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "permissao.notFound",
  INVALID_MODULO: "permissao.invalidModulo",
  INVALID_NIVEL: "permissao.invalidNivel",
  ADMIN_IMMUTABLE: "permissao.adminImmutable",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  INVALID_MODULO: 400,
  INVALID_NIVEL: 400,
  ADMIN_IMMUTABLE: 403,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Permissão",
});

export const listarPermissoes = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const permissoes = await permissoesService.list();
    res.status(200).json(permissoes);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const listarPermissoesPorFuncao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const funcao = req.params.funcao as FuncaoUtilizador;
    const permissoes = await permissoesService.getByFuncao(funcao);
    res.status(200).json(permissoes);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarPermissao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { funcao, modulo, nivelAcesso } = req.body;
    const permissao = await permissoesService.update({ funcao, modulo, nivelAcesso });
    res.status(200).json(permissao);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarPermissoesBulk = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { permissoes } = req.body;
    if (!Array.isArray(permissoes)) throw new Error("INVALID_NIVEL");

    // Filter out ADMINISTRADOR entries — they are immutable
    const filtered = permissoes.filter((p: { funcao: string }) => p.funcao !== "ADMINISTRADOR");

    const results = await permissoesService.bulkUpdate(filtered);
    res.status(200).json({
      message: req.t("permissao.updatedSuccessfully"),
      data: results,
    });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const minhasPermissoes = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const permissoes = await permissoesService.getByFuncao(user.funcao as FuncaoUtilizador);
    // Return as a map { modulo: nivelAcesso } for easy frontend consumption
    const permMap: Record<string, string> = {};
    for (const p of permissoes) {
      permMap[p.modulo] = p.nivelAcesso;
    }
    res.status(200).json({ funcao: user.funcao, permissoes: permMap });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const restaurarDefaults = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    // Delete all existing permissions and re-seed
    await permissoesService.seedDefaults();
    const permissoes = await permissoesService.list();
    res.status(200).json({
      message: req.t("permissao.restoredDefaults"),
      data: permissoes,
    });
  } catch (error) {
    handleError(error, req, res);
  }
};