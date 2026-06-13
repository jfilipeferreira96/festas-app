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

type Params = { params: Promise<{ id: string }> };

// POST /api/campanhas/:id/enviar
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const campanha = await campanhaService.enviar(id);
    return NextResponse.json(campanha);
  } catch (error) {
    return handleError(error);
  }
}
