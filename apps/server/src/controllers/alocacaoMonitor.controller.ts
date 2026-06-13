import type { Request, Response } from "express";
import { alocacaoMonitorService } from "../services/alocacaoMonitor.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "alocacao.notFound",
  MONITOR_REQUIRED: "alocacao.monitorRequired",
  LOCAL_REQUIRED: "alocacao.localRequired",
  DATA_REQUIRED: "alocacao.dataRequired",
  HORAS_INVALIDAS: "alocacao.horasInvalidas",
  MONITOR_OVERLAP: "alocacao.monitorOverlap",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  MONITOR_REQUIRED: 400,
  LOCAL_REQUIRED: 400,
  DATA_REQUIRED: 400,
  HORAS_INVALIDAS: 400,
  MONITOR_OVERLAP: 409,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "AlocacaoMonitor",
});

export const listarAlocacoes = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { data, dataInicio, dataFim, monitorId, localId } = req.query;

    const alocacoes = await alocacaoMonitorService.list({
      ...(data ? { data: data as string } : {}),
      ...(dataInicio ? { dataInicio: dataInicio as string } : {}),
      ...(dataFim ? { dataFim: dataFim as string } : {}),
      ...(monitorId ? { monitorId: monitorId as string } : {}),
      ...(localId ? { localId: localId as string } : {}),
    });

    res.status(200).json(alocacoes);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterAlocacao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const alocacao = await alocacaoMonitorService.getById(id);
    res.status(200).json(alocacao);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarAlocacao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { data, horaInicio, horaFim, monitorId, localId, observacoes } = req.body;
    const alocacao = await alocacaoMonitorService.create({
      data,
      horaInicio: Number(horaInicio),
      horaFim: Number(horaFim),
      monitorId,
      localId,
      observacoes,
    });
    res.status(201).json(alocacao);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarAlocacao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { data, horaInicio, horaFim, monitorId, localId, observacoes } = req.body;
    const alocacao = await alocacaoMonitorService.update(id, {
      ...(data !== undefined ? { data } : {}),
      ...(horaInicio !== undefined ? { horaInicio: Number(horaInicio) } : {}),
      ...(horaFim !== undefined ? { horaFim: Number(horaFim) } : {}),
      ...(monitorId !== undefined ? { monitorId } : {}),
      ...(localId !== undefined ? { localId } : {}),
      ...(observacoes !== undefined ? { observacoes } : {}),
    });
    res.status(200).json(alocacao);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarAlocacao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await alocacaoMonitorService.delete(id);
    res.status(200).json({ message: req.t("alocacao.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};
