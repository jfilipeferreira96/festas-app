import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

// GET /api/entradas-livres/configuracao
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const configs = await entradaLivreService.listarConfiguracoes();
    return NextResponse.json(configs);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/entradas-livres/configuracao
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const config = await entradaLivreService.upsertConfiguracao(await request.json());
    return NextResponse.json(config);
  } catch (error) {
    return handleError(error);
  }
}
