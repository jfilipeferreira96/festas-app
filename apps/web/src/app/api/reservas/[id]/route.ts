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
      horaLanche,
      salaLancheId,
      duracaoMinutos,
      localId,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      boloTema,
      boloQuantidade,
      numCriancasConfirmadas,
      notasCacifos,
      notasLanche,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      pagamentos,
      meiasQuantidade,
      pago,
      caucao,
      valorCaucao,
      descontoPercentagem,
      descontoMotivo,
      extrasIds,
      extrasTexto,
      extrasQuantidades,
      monitoresIds,
      etapasIds,
      aniversariantes,
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      menuId,
      menuNome,
      menuPreco,
      menuNotas,
    } = await request.json();

    await reservaService.update(id, {
      data,
      horario,
      horaLanche,
      salaLancheId,
      duracaoMinutos,
      localId,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      boloTema,
      boloQuantidade,
      numCriancasConfirmadas,
      notasCacifos,
      notasLanche,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      pagamentos,
      meiasQuantidade,
      pago,
      caucao,
      valorCaucao,
      descontoPercentagem,
      descontoMotivo,
      extrasIds,
      extrasTexto,
      extrasQuantidades,
      monitoresIds,
      etapasIds,
      aniversariantes,
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      menuId: menuId === null ? null : (menuId || undefined),
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
