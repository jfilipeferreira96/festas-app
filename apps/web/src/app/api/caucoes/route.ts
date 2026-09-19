import { NextRequest, NextResponse } from "next/server";
import { caucaoService } from "@/services/caucao.service";
import { requireAuth } from "@/lib/auth-server";

// GET /api/caucoes - lista consolidada de cauciones (pagas / por pagar)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const caucoes = await caucaoService.listarCaucoes({
      estadoCaucao: searchParams.get("estadoCaucao") ?? undefined,
      dataInicio: searchParams.get("dataInicio") ?? undefined,
      dataFim: searchParams.get("dataFim") ?? undefined,
      pesquisa: searchParams.get("pesquisa") ?? undefined,
    });
    return NextResponse.json(caucoes);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
