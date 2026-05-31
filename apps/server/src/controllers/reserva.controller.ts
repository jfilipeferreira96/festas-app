import type { Request, Response } from "express";
import { reservaService } from "../services/reserva.service";
import { menuService } from "../services/menu.service";
import { createErrorHandler } from "../utils/errorHandler";

const ERROR_MAP: Record<string, string> = {
  NOT_FOUND: "reserva.notFound",
  LOCAL_NOT_FOUND: "local.notFound",
  LOCAL_INACTIVE: "local.inactive",
  LOCAL_NOT_AVAILABLE: "reserva.localNotAvailable",
  CAPACITY_EXCEEDED: "reserva.capacityExceeded",
  INVALID_STATUS: "reserva.invalidStatus",
  CANNOT_MODIFY_IN_PROGRESS: "reserva.cannotModifyInProgress",
  CANNOT_DELETE_IN_PROGRESS: "reserva.cannotDeleteInProgress",
  RESERVA_NOT_CONFIRMED: "reserva.notConfirmed",
  ALREADY_IN_PROGRESS: "reserva.alreadyInProgress",
  NOT_IN_PROGRESS: "reserva.notInProgress",
  MONITOR_NOT_FOUND: "monitor.notFound",
  MONITOR_INACTIVE: "monitor.inactive",
  ETAPA_NOT_FOUND: "reserva.etapaNotFound",
  CLIENTE_REQUIRED: "reserva.clienteRequired",
  ANIVERSARIANTE_REQUIRED: "reserva.aniversarianteRequired",
  DATA_REQUIRED: "reserva.dataRequired",
  HORARIO_REQUIRED: "reserva.horarioRequired",
  LOCAL_REQUIRED: "reserva.localRequired",
};

const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  LOCAL_NOT_FOUND: 404,
  LOCAL_INACTIVE: 400,
  LOCAL_NOT_AVAILABLE: 409,
  CAPACITY_EXCEEDED: 409,
  INVALID_STATUS: 400,
  CANNOT_MODIFY_IN_PROGRESS: 400,
  CANNOT_DELETE_IN_PROGRESS: 400,
  RESERVA_NOT_CONFIRMED: 400,
  ALREADY_IN_PROGRESS: 409,
  NOT_IN_PROGRESS: 400,
  MONITOR_NOT_FOUND: 404,
  MONITOR_INACTIVE: 400,
  ETAPA_NOT_FOUND: 404,
  CLIENTE_REQUIRED: 400,
  ANIVERSARIANTE_REQUIRED: 400,
  DATA_REQUIRED: 400,
  HORARIO_REQUIRED: 400,
  LOCAL_REQUIRED: 400,
};

const handleError = createErrorHandler({
  errorMap: ERROR_MAP,
  statusMap: STATUS_MAP,
  serviceName: "Reserva",
});

export const listarReservas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const filtros = {
      estado: req.query.estado as string | undefined,
      data: req.query.data as string | undefined,
      localId: req.query.localId as string | undefined,
      pesquisa: req.query.pesquisa as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
    };
    const reservas = await reservaService.list(filtros);
    res.status(200).json(reservas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const obterReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const reserva = await reservaService.getById(id);
    res.status(200).json(reserva);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const criarReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const {
      data,
      horario,
      duracaoMinutos,
      localId,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      metodoPagamento,
      valorPago,
      pago,
      referenciaPagamento,
      caucao,
      extrasIds,
      monitoresIds,
      etapasIds,
      aniversariantes,
      participantes,
      // Menu
      menuNome,
      menuPreco,
      menuNotas,
    } = req.body;

    const reserva = await reservaService.create({
      data,
      horario,
      duracaoMinutos,
      localId,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      metodoPagamento,
      valorPago,
      pago,
      referenciaPagamento,
      caucao,
      extrasIds: extrasIds || [],
      monitoresIds: monitoresIds || undefined,
      etapasIds: etapasIds || undefined,
      aniversariantes: aniversariantes || undefined,
      participantes: participantes || undefined,
    });

    // Create menu if provided
    if (menuNome && menuPreco !== undefined) {
      await menuService.createOrUpdateForReserva(reserva.id, { nome: menuNome, preco: menuPreco, notas: menuNotas });
    }

    // Re-fetch with all includes
    const result = await reservaService.getById(reserva.id);
    res.status(201).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const {
      data,
      horario,
      duracaoMinutos,
      localId,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      metodoPagamento,
      valorPago,
      pago,
      referenciaPagamento,
      caucao,
      extrasIds,
      monitoresIds,
      etapasIds,
      aniversariantes,
      participantes,
      // Menu
      menuNome,
      menuPreco,
      menuNotas,
    } = req.body;

    const reserva = await reservaService.update(id, {
      data,
      horario,
      duracaoMinutos,
      localId,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      metodoPagamento,
      valorPago,
      pago,
      referenciaPagamento,
      caucao,
      extrasIds,
      monitoresIds,
      etapasIds,
      aniversariantes,
      participantes,
    });

    // Create or update menu if provided
    if (menuNome && menuPreco !== undefined) {
      await menuService.createOrUpdateForReserva(id, { nome: menuNome, preco: menuPreco, notas: menuNotas });
    }

    // Re-fetch with all includes
    const result = await reservaService.getById(id);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const atualizarEstadoReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { estado } = req.body;
    const reserva = await reservaService.updateStatus(id, estado);
    res.status(200).json(reserva);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const eliminarReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    await reservaService.delete(id);
    res.status(200).json({ message: req.t("reserva.deleted") });
  } catch (error) {
    handleError(error, req, res);
  }
};

// ── Runtime controllers (previously in festa.controller) ────────

export const getReservasAtivas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const reservas = await reservaService.getActive();
    res.status(200).json(reservas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const getReservasConcluidas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const data = req.query.data as string | undefined;
    const reservas = await reservaService.getConcluidas(data);
    res.status(200).json(reservas);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const iniciarReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const reserva = await reservaService.iniciar(id);
    res.status(200).json(reserva);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const finalizarReserva = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const reserva = await reservaService.finalizar(id);
    res.status(200).json(reserva);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const alocarMonitor = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { monitorId } = req.body;
    const result = await reservaService.alocarMonitor(id, monitorId);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const removerMonitor = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { monitorId } = req.body;
    const result = await reservaService.removerMonitor(id, monitorId);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const toggleEtapa = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const { etapaId } = req.body;
    const result = await reservaService.toggleEtapa(id, etapaId);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const removerEtapa = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const etapaId = req.params.etapaId as string;
    const result = await reservaService.removerEtapa(id, etapaId);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};

export const marcarEtapasConcluidas = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: req.t("auth.unauthorized") });

    const id = req.params.id as string;
    const result = await reservaService.marcarEtapasConcluidas(id);
    res.status(200).json(result);
  } catch (error) {
    handleError(error, req, res);
  }
};
