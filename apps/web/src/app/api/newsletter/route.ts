import { NextRequest, NextResponse } from "next/server";
import { newsletterService } from "@/services/newsletter.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "Newsletter",
});

// GET /api/newsletter/segmentos
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const segmentos = await newsletterService.listSegmentos();
    return NextResponse.json(segmentos);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/newsletter/sincronizar-aniversariantes (ADMINISTRADOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const resultado = await newsletterService.sincronizarAniversariantes();
    return NextResponse.json({
      message: `${resultado.criados} contacto(s) criado(s), ${resultado.actualizados} adicionado(s) ao segmento`,
      data: resultado,
    });
  } catch (error) {
    return handleError(error);
  }
}
