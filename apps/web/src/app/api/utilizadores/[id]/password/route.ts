import { NextRequest, NextResponse } from "next/server";
import { utilizadorService } from "@/services/utilizador.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "utilizador.notFound",
    PASSWORD_TOO_SHORT: "auth.passwordTooShort",
    CANNOT_CHANGE_OWN_PASSWORD: "utilizador.cannotChangeOwnPassword",
  },
  statusMap: {
    NOT_FOUND: 404,
    CANNOT_CHANGE_OWN_PASSWORD: 403,
  },
  serviceName: "Utilizador",
});

type Params = { params: Promise<{ id: string }> };

// PATCH /api/utilizadores/:id/password (ADMINISTRADOR)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    const { password } = await request.json();
    const result = await utilizadorService.updatePassword(id, { password }, auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
