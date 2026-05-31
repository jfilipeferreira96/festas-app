import type { Request, Response } from "express";
import { utilizadorService } from "../services/utilizador.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "utilizador.notFound",
  NAME_REQUIRED: "auth.nameRequired",
  EMAIL_REQUIRED: "auth.emailRequired",
  PASSWORD_REQUIRED: "auth.passwordTooShort",
  FUNCAO_REQUIRED: "utilizador.funcaoRequired",
  EMAIL_ALREADY_EXISTS: "auth.emailAlreadyExists",
  USER_CREATION_FAILED: "utilizador.creationFailed",
  CANNOT_CHANGE_OWN_FUNCAO: "utilizador.cannotChangeOwnFuncao",
  CANNOT_CHANGE_OWN_ACTIVO: "utilizador.cannotChangeOwnActivo",
  CANNOT_DELETE_SELF: "utilizador.cannotDeleteSelf",
  MUST_HAVE_ADMIN: "utilizador.mustHaveAdmin",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  EMAIL_ALREADY_EXISTS: 409,
  CANNOT_CHANGE_OWN_FUNCAO: 403,
  CANNOT_CHANGE_OWN_ACTIVO: 403,
  CANNOT_DELETE_SELF: 403,
  MUST_HAVE_ADMIN: 409,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Utilizador",
});

export const listarUtilizadores = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const utilizadores = await utilizadorService.list();
    res.status(200).json(utilizadores);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterUtilizador = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const utilizador = await utilizadorService.getById(id);
    res.status(200).json(utilizador);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarUtilizador = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { name, email, password, funcao } = req.body;
    const utilizador = await utilizadorService.create({
      name,
      email,
      password,
      funcao,
    });
    res.status(201).json(utilizador);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarFuncao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { funcao } = req.body;
    const utilizador = await utilizadorService.updateFuncao(id, { funcao }, user.id);
    res.status(200).json(utilizador);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarActivo = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { activo } = req.body;
    const utilizador = await utilizadorService.updateActivo(id, { activo }, user.id);
    res.status(200).json(utilizador);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarUtilizador = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const utilizador = await utilizadorService.delete(id, user.id);
    res.status(200).json({
      message: req.t("utilizador.deletedSuccessfully"),
      utilizador,
    });
  } catch (error) {
    handleError(error, req, res);
  }
};