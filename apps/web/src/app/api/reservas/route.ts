import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
// (auth.user é passado ao service para auditoria dos ajustes iniciais)
import { menuService } from "@/services/menu.service";
import { requireAuth } from "@/lib/auth-server";
// Handler partilhado com [id]route.ts: inclui SLOT_OCCUPIED, MENU_NOT_FOUND,
// PAGAMENTO_* e tradução de erros Prisma (o mapa inline antigo não tinha
// SLOT_OCCUPIED e devolvia 500 "Erro interno" em vez de 409 ao criar numa
// slot já ocupada).
import { handleError } from "./error-handler";

// GET /api/reservas[?estado=&data=&pesquisa=&page=&pageSize=]
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
      horaLanche,
      salaLancheId,
      duracaoMinutos,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      boloTema,
      observacoesGerais,
      observacoesLesoes,
      observacoesBrindes,
      outrosExtras,
      pagamentos,
      ajustes,
      meiasQuantidade,
      pago,
      caucao,
      valorCaucao,
      descontoPercentagem,
      descontoMotivo,
      boloQuantidade,
      numCriancasConfirmadas,
      notasCacifos,
      notasLanche,
      extrasIds,
      extrasTexto,
      extrasQuantidades,
      monitoresIds,
      etapasIds,
      aniversariantes,
      // Cliente fields
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      adicionarCliente,
      enviarEmail,
      menuId,
      menuNome,
      menuPreco,
      menuNotas,
    } = await request.json();

    const reserva = await reservaService.create({
      data,
      horario,
      horaLanche,
      salaLancheId,
      duracaoMinutos,
      clienteId,
      numCriancas,
      notas,
      tema,
      previsaoCriancas,
      cor,
      bolo,
      boloTema,
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
      boloQuantidade,
      numCriancasConfirmadas,
      notasCacifos,
      notasLanche,
      extrasIds: extrasIds || [],
      extrasTexto: extrasTexto || undefined,
      extrasQuantidades: extrasQuantidades || undefined,
      monitoresIds: monitoresIds || undefined,
      etapasIds: etapasIds || undefined,
      aniversariantes: aniversariantes || undefined,
      clienteNome,
      clienteContacto,
      clienteEmail,
      clienteCodigoPostal,
      adicionarCliente,
      enviarEmail,
      // "NONE" é um valor só de UI ("Sem menu"); nunca é um ID real de Extra.
      menuId: menuId === "NONE" ? undefined : menuId || undefined,
      ajustes: ajustes || undefined,
    }, auth.user);

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
