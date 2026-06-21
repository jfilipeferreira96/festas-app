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

// GET /api/utilizadores (ADMINISTRADOR, GESTOR)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const utilizadores = await utilizadorService.list();
    return NextResponse.json(utilizadores);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/utilizadores (ADMINISTRADOR)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { name, email, password, funcao } = await request.json();
    const utilizador = await utilizadorService.create({
      name,
      email,
      password,
      funcao,
    });
    return NextResponse.json(utilizador, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
