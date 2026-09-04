import { NextRequest, NextResponse } from "next/server";
import { notaDiariaService } from "@/services/notaDiaria.service";
import { requireAuth, checkModulo } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "NotaDiaria",
});

// GET /api/notas-diarias?data=YYYY-MM-DD
// Acesso: MONITOR (leitura) ou ADMINISTRADOR
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "monitores", "leitura");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get("data");
    const data = dataParam ? new Date(dataParam) : new Date();

    const nota = await notaDiariaService.getByData(data);
    return NextResponse.json(nota);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/notas-diarias - upsert notas (manhã + tarde)
// Acesso: ADMINISTRADOR (escrita)
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const denied = checkModulo(auth.user, "monitores", "escrita");
    if (denied) return denied;

    const body = await request.json();
    if (!body.data) {
      return NextResponse.json({ error: "Data é obrigatória" }, { status: 400 });
    }

    const nota = await notaDiariaService.upsert({
      data: body.data,
      notasManha: body.notasManha,
      notasTarde: body.notasTarde,
    });
    return NextResponse.json(nota);
  } catch (error) {
    return handleError(error);
  }
}
