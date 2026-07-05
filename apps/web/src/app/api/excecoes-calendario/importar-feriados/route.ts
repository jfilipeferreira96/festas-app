import { NextRequest, NextResponse } from "next/server";
import { excecaoCalendarioService } from "@/services/excecaoCalendario.service";
import { requireAuth, checkFuncao } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    FERIADOS_API_ERROR: "excecaoCalendario.feriadosApiError",
  },
  statusMap: {
    FERIADOS_API_ERROR: 502,
  },
  serviceName: "ExcecaoCalendario",
});

// POST /api/excecoes-calendario/importar-feriados (ADMINISTRADOR)
// Body: { ano: number }
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkFuncao(auth.user, "ADMINISTRADOR");
    if (denied) return denied;

    const { ano } = await request.json();

    if (!ano || typeof ano !== "number" || ano < 2000 || ano > 2100) {
      return NextResponse.json(
        { error: "Ano inválido" },
        { status: 400 }
      );
    }

    const resultado = await excecaoCalendarioService.importarFeriados(ano);
    return NextResponse.json({
      message: `${resultado.criados} feriado(s) importado(s), ${resultado.ignorados} já existia(m)`,
      data: resultado,
    });
  } catch (error) {
    return handleError(error);
  }
}
