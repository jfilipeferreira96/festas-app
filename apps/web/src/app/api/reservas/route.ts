import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { menuService } from "@/services/menu.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "reserva.notFound",
    LOCAL_NOT_FOUND: "local.notFound",
    LOCAL_INACTIVE: "local.inactive",
    LOCAL_NOT_AVAILABLE: "reserva.localNotAvailable",
    DAY_BLOCKED: "reserva.dayBlocked",
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
    DATA_NASCIMENTO_REQUIRED: "reserva.dataNascimentoRequired",
    DATA_REQUIRED: "reserva.dataRequired",
    HORARIO_REQUIRED: "reserva.horarioRequired",
    LOCAL_REQUIRED: "reserva.localRequired",
  },
  statusMap: {
    NOT_FOUND: 404,
    LOCAL_NOT_FOUND: 404,
    LOCAL_INACTIVE: 400,
    LOCAL_NOT_AVAILABLE: 409,
    DAY_BLOCKED: 409,
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
    DATA_NASCIMENTO_REQUIRED: 400,
    DATA_REQUIRED: 400,
    HORARIO_REQUIRED: 400,
    LOCAL_REQUIRED: 400,
  },
  serviceName: "Reserva",
});

// GET /api/reservas[?estado=&data=&localId=&pesquisa=&page=&pageSize=]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const filtros = {
      estado: searchParams.get("estado") || undefined,
      data: searchParams.get("data") || undefined,
      dataInicio: searchParams.get("dataInicio") || undefined,
      dataFim: searchParams.get("dataFim") || undefined,
      localId: searchParams.get("localId") || undefined,
      pesquisa: searchParams.get("pesquisa") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page") as string) : undefined,
      pageSize: searchParams.get("pageSize")
        ? parseInt(searchParams.get("pageSize") as string)
        : undefined,
    };
    const reservas = await reservaService.list(filtros);
    return NextResponse.json(reservas);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/reservas
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

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
      valorCaucao,
      descontoPercentagem,
      descontoMotivo,
      boloQuantidade,
      extrasIds,
      extrasTexto,
      monitoresIds,
      etapasIds,
      aniversariantes,
      participantes,
      // Cliente fields
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      adicionarCliente,
      // Menu
      menuNome,
      menuPreco,
      menuNotas,
    } = await request.json();

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
      valorCaucao,
      descontoPercentagem,
      descontoMotivo,
      boloQuantidade,
      extrasIds: extrasIds || [],
      extrasTexto: extrasTexto || undefined,
      monitoresIds: monitoresIds || undefined,
      etapasIds: etapasIds || undefined,
      aniversariantes: aniversariantes || undefined,
      participantes: participantes || undefined,
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      adicionarCliente,
    });

    // Create menu if provided
    if (menuNome && menuPreco !== undefined) {
      await menuService.createOrUpdateForReserva(reserva.id, {
        nome: menuNome,
        preco: menuPreco,
        notas: menuNotas,
      });
    }

    // Re-fetch with all includes
    const result = await reservaService.getById(reserva.id);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
