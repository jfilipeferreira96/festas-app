import type { Request, Response } from "express";
import { relatorioService } from "../services/relatorio.service";
import { createErrorHandler } from "../utils/errorHandler";

const handleError = createErrorHandler({
  errorMap: {
    INVALID_DATE_RANGE: "relatorio.invalidDateRange",
    DATA_INICIO_REQUIRED: "relatorio.dataInicioRequired",
    DATA_FIM_REQUIRED: "relatorio.dataFimRequired",
  },
  statusMap: {
    INVALID_DATE_RANGE: 400,
    DATA_INICIO_REQUIRED: 400,
    DATA_FIM_REQUIRED: 400,
  },
  serviceName: "Relatório",
});

export const getRelatorioFinanceiro = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { dataInicio, dataFim } = req.query;

    if (!dataInicio || typeof dataInicio !== "string") {
      throw new Error("DATA_INICIO_REQUIRED");
    }
    if (!dataFim || typeof dataFim !== "string") {
      throw new Error("DATA_FIM_REQUIRED");
    }

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) {
      throw new Error("INVALID_DATE_RANGE");
    }
    if (inicio > fim) {
      throw new Error("INVALID_DATE_RANGE");
    }

    const relatorio = await relatorioService.getRelatorioFinanceiro(inicio, fim);
    res.status(200).json(relatorio);
  } catch (error) {
    handleError(error, req, res);
  }
};