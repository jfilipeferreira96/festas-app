import { NextRequest, NextResponse } from "next/server";
import { utilizadorService } from "@/services/utilizador.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "utilizador.notFound",
    NAME_REQUIRED: "auth.nameRequired",
    EMAIL_REQUIRED: "auth.emailRequired",
    PASSWORD_REQUIRED: "auth.passwordTooShort",
    FUNCAO_REQUIRED: "utilizador.funcaoRequired",
    EMAIL_ALREADY_EXISTS: "auth.emailAlreadyExists",
    USER_CREATION_FAILED: "utilizador.creationFailed",
    CANNOT_CHANGE_OWN_FUNCAO: "utilizador.cannotChangeOwnFuncao",
    CANNOT_CHANGE_OWN_ACTIVO: "utilizador.cannotChangeOwnActivo",
    CANNOT_DELETE_SELF: "utilizador.cannotDeleteSelf",
    MUST_HAVE_ADMIN: "utilizador.mustHaveAdmin",
  },
  statusMap: {
    NOT_FOUND: 404,
    EMAIL_ALREADY_EXISTS: 409,
    CANNOT_CHANGE_OWN_FUNCAO: 403,
    CANNOT_CHANGE_OWN_ACTIVO: 403,
    CANNOT_DELETE_SELF: 403,
    MUST_HAVE_ADMIN: 409,
  },
  serviceName: "Utilizador",
});

type Params = { params: Promise<{ id: string }> };

// PATCH /api/utilizadores/:id/activo (ADMINISTRADOR)
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { id } = await params;
    const { activo } = await request.json();
    const utilizador = await utilizadorService.updateActivo(id, { activo }, auth.user.id);
    return NextResponse.json(utilizador);
  } catch (error) {
    return handleError(error);
  }
}
