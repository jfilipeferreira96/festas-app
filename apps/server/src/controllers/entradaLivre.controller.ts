import type { Request, Response } from "express";
import { entradaLivreService } from "../services/entradaLivre.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "entradaLivre.notFound",
  NOT_ACTIVE: "entradaLivre.notActive",
  CONFIG_NOT_FOUND: "entradaLivre.configNotFound",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  NOT_ACTIVE: 400,
  CONFIG_NOT_FOUND: 404,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "EntradaLivre",
});

// ── Listar ────────────────────────────────────────
export const listarEntradas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const filtros = {
      estado: req.query.estado as string | undefined,
      localId: req.query.localId as string | undefined,
      data: req.query.data as string | undefined,
      dataInicio: req.query.dataInicio as string | undefined,
      dataFim: req.query.dataFim as string | undefined,
      pesquisa: req.query.pesquisa as string | undefined,
    };
    const entradas = await entradaLivreService.list(filtros);
    res.status(200).json(entradas);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Obter por ID ──────────────────────────────────
export const obterEntrada = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const entrada = await entradaLivreService.getById(id);
    res.status(200).json(entrada);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Criar ─────────────────────────────────────────
export const criarEntrada = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const entrada = await entradaLivreService.create(req.body);
    res.status(201).json(entrada);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Concluir ──────────────────────────────────────
export const concluirEntrada = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const entrada = await entradaLivreService.concluir(id);
    res.status(200).json(entrada);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Cancelar ──────────────────────────────────────
export const cancelarEntrada = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const entrada = await entradaLivreService.cancelar(id);
    res.status(200).json(entrada);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Atualizar pagamento ───────────────────────────
export const atualizarPagamento = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const entrada = await entradaLivreService.atualizarPagamento(id, req.body);
    res.status(200).json(entrada);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Atualizar observações ─────────────────────────
export const atualizarEntrada = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const entrada = await entradaLivreService.atualizar(id, req.body);
    res.status(200).json(entrada);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Eliminar ──────────────────────────────────────
export const eliminarEntrada = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const result = await entradaLivreService.eliminar(id);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Contadores ────────────────────────────────────
export const getContadores = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const contadores = await entradaLivreService.getContadores();
    res.status(200).json(contadores);
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Configuração ──────────────────────────────────
export const getConfiguracao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const localId = req.params.localId as string;
    const config = await entradaLivreService.getConfiguracao(localId);
    res.status(200).json(config);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const listarConfiguracoes = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const configs = await entradaLivreService.listarConfiguracoes();
    res.status(200).json(configs);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const upsertConfiguracao = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const config = await entradaLivreService.upsertConfiguracao(req.body);
    res.status(200).json(config);
  } catch (error) {
    handleError(error, req, res);
  }
};