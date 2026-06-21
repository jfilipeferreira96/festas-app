import { NextRequest, NextResponse } from "next/server";
import { festasAcabarService } from "@/services/festasAcabar.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "reserva.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "FestasAcabar",
});

// GET /api/festas-acabar
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "festas_acabar", "leitura");
    if (denied) return denied;

    const festas = await festasAcabarService.getFestas();
    return NextResponse.json(festas);
  } catch (error) {
    return handleError(error);
  }
}
