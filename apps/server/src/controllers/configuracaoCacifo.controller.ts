import type { Request, Response } from "express";
import { configuracaoCacifoService } from "../services/configuracaoCacifo.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  CONFIG_ALREADY_EXISTS: "configuracaoCacifo.alreadyExists",
  CANNOT_REDUCE_OCCUPIED: "configuracaoCacifo.cannotReduceOccupied",
};

const STATUS_MAP: Record<string, number> = {
  CONFIG_ALREADY_EXISTS: 409,
  CANNOT_REDUCE_OCCUPIED: 409,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "ConfiguracaoCacifo",
});

export const getConfig = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const config = await configuracaoCacifoService.getConfig();
    res.status(200).json(config);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const inicializar = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { totalCacifos } = req.body;
    const config = await configuracaoCacifoService.inicializar(totalCacifos);
    res.status(201).json({ message: req.t("configuracaoCacifo.initialized"), data: config });
  } catch (error) {
    handleError(error, req, res);
  }
};

export const updateConfig = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { totalCacifos, nomes } = req.body;
    const config = await configuracaoCacifoService.updateConfig({ totalCacifos, nomes });
    res.status(200).json({ message: req.t("configuracaoCacifo.updated"), data: config });
  } catch (error) {
    handleError(error, req, res);
  }
};