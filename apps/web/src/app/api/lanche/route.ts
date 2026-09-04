import { NextRequest, NextResponse } from "next/server";
import { lancheService } from "@/services/lanche.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: { NOT_FOUND: "reserva.notFound" },
  statusMap: { NOT_FOUND: 404 },
  serviceName: "Lanche",
});

// GET /api/lanche[?data=YYYY-MM-DD][?alergias=true]
// Acesso: conta LANCHE (escrita) ou ADMINISTRADOR (todas as funções)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // Lanche é um módulo próprio - LANCHE tem escrita, ADMINISTRADOR tudo
    const denied = checkModulo(auth.user, "lanche", "escrita");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get("data");
    const apenasAlergias = searchParams.get("alergias") === "true";
    const data = dataParam ? new Date(dataParam) : undefined;

    if (apenasAlergias) {
      return NextResponse.json(await lancheService.getAlergias(data));
    }

    return NextResponse.json(await lancheService.getLanchesDoDia(data));
  } catch (error) {
    return handleError(error);
  }
}
