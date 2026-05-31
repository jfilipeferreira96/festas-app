import type { Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service";
import { createErrorHandler } from "../utils/errorHandler";

const handleError = createErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "Dashboard",
});

export const getKPIs = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const kpis = await dashboardService.getKPIs();
    res.status(200).json(kpis);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getFestasEmCurso = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const festas = await dashboardService.getFestasEmCurso();
    res.status(200).json(festas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getProximasFestas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const festas = await dashboardService.getProximasFestas();
    res.status(200).json(festas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getAniversarioEmBreve = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const reserva = await dashboardService.getAniversarioEmBreve();
    res.status(200).json(reserva);
  } catch (error) {
    handleError(error, req, res);
  }
};
