import type { Request, Response } from "express";
import { clienteService } from "../services/cliente.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "cliente.notFound",
  EMAIL_EXISTS: "cliente.emailExists",
  NOME_REQUIRED: "cliente.nomeRequired",
  EMAIL_REQUIRED: "cliente.emailRequired",
  TELEFONE_REQUIRED: "cliente.telefoneRequired",
  EMAIL_ALREADY_EXISTS: "cliente.emailExists",
  TELEFONE_ALREADY_EXISTS: "cliente.telefoneExists",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  EMAIL_EXISTS: 409,
  NOME_REQUIRED: 400,
  EMAIL_REQUIRED: 400,
  TELEFONE_REQUIRED: 400,
  EMAIL_ALREADY_EXISTS: 409,
  TELEFONE_ALREADY_EXISTS: 409,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Cliente",
});

export const listarClientes = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const search = req.query.search as string | undefined;
    if (search) {
      const clientes = await clienteService.search(search);
      return res.status(200).json(clientes);
    }

    const filtros = {
      pesquisa: req.query.pesquisa as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    };
    const result = await clienteService.list(filtros);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterCliente = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const cliente = await clienteService.getById(id);
    res.status(200).json(cliente);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarCliente = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const { nome, email, telefone, contribuinte, codigoPostal, observacao } = req.body;
    const cliente = await clienteService.create({ nome, email, telefone, contribuinte, codigoPostal, observacao });
    res.status(201).json(cliente);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarCliente = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { nome, email, telefone, contribuinte, codigoPostal, observacao } = req.body;
    const cliente = await clienteService.update(id, { nome, email, telefone, contribuinte, codigoPostal, observacao });
    res.status(200).json(cliente);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarCliente = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await clienteService.delete(id);
    res.status(200).json({ message: req.t("cliente.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};