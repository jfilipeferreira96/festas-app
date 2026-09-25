import { NextRequest, NextResponse } from "next/server";
import { checkFuncao, requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { gerarConviteDaReserva } from "@/services/email.service";

type Params = { params: Promise<{ id: string }> };

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "reserva.notFound",
    SEM_ANIVERSARIANTE: "convite.semAniversariante",
    CONVITE_INDICE_INVALIDO: "convite.indiceInvalido",
  },
  statusMap: {
    NOT_FOUND: 404,
    SEM_ANIVERSARIANTE: 400,
    CONVITE_INDICE_INVALIDO: 400,
  },
  serviceName: "ConviteService",
});

// GET /api/reservas/:id/convite?n=0 - JPEG do convite preenchido (ADMIN).
// Com modo SEPARADO, `n` escolhe a criança (0-based); default 0.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;
    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    const nParam = Number(request.nextUrl.searchParams.get("n") ?? "0");
    const indice = Number.isInteger(nParam) && nParam >= 0 ? nParam : 0;

    const convite = await gerarConviteDaReserva(id, indice);

    return new NextResponse(new Uint8Array(convite.content), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `inline; filename="${convite.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
