import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { menuService } from "@/services/menu.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";
import { t } from "@/lib/i18n-server";

type Params = { params: Promise<{ id: string }> };

// GET /api/reservas/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const reserva = await reservaService.getById(id);
    return NextResponse.json(reserva);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/reservas/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
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
      boloQuantidade,
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
      extrasIds,
      extrasTexto,
      monitoresIds,
      etapasIds,
      aniversariantes,
      participantes,
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      // Menu
      menuNome,
      menuPreco,
      menuNotas,
    } = await request.json();

    await reservaService.update(id, {
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
      boloQuantidade,
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
      extrasIds,
      extrasTexto,
      monitoresIds,
      etapasIds,
      aniversariantes,
      participantes,
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
    });

    // Create or update menu if provided
    if (menuNome && menuPreco !== undefined) {
      await menuService.createOrUpdateForReserva(id, {
        nome: menuNome,
        preco: menuPreco,
        notas: menuNotas,
      });
    }

    // Re-fetch with all includes
    const result = await reservaService.getById(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/reservas/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await reservaService.delete(id);
    return NextResponse.json({ message: t("reserva.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
