import { NextRequest, NextResponse } from "next/server";
import { cacifoService } from "@/services/cacifo.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "cacifo.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "CacifoHistorico",
});

type Params = { params: Promise<{ id: string }> };

// GET /api/cacifos/:id/historico — histórico de ocupações do cacifo
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "cacifos", "leitura");
    if (denied) return denied;

    const { id } = await params;
    const historico = await cacifoService.getHistorico(id);
    return NextResponse.json(historico);
  } catch (error) {
    return handleError(error);
  }
}
