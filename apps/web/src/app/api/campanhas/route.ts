import { NextRequest, NextResponse } from "next/server";
import { campanhaService } from "@/services/campanha.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "campanha.notFound",
    SEGMENTO_NOT_FOUND: "campanha.segmentoNotFound",
    CANNOT_EDIT_SENT: "campanha.cannotEditSent",
    ALREADY_SENT: "campanha.alreadySent",
    NO_CONTACTS: "campanha.noContacts",
    CANNOT_DELETE_SENT: "campanha.cannotDeleteSent",
  },
  statusMap: {
    NOT_FOUND: 404,
    SEGMENTO_NOT_FOUND: 404,
    CANNOT_EDIT_SENT: 400,
    ALREADY_SENT: 409,
    NO_CONTACTS: 400,
    CANNOT_DELETE_SENT: 400,
  },
  serviceName: "Campanha",
});

// GET /api/campanhas[?tipo=]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || undefined;
    const campanhas = await campanhaService.list(tipo);
    return NextResponse.json(campanhas);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/campanhas
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { tipo, assunto, mensagem, segmentoId, agendadaPara } = await request.json();
    const campanha = await campanhaService.create({
      tipo,
      assunto,
      mensagem,
      segmentoId,
      agendadaPara,
    });
    return NextResponse.json(campanha, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
