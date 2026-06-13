import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../../../error-handler";

type Params = { params: Promise<{ localId: string }> };

// GET /api/entradas-livres/configuracao/local/:localId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { localId } = await params;
    const config = await entradaLivreService.getConfiguracao(localId);
    return NextResponse.json(config);
  } catch (error) {
    return handleError(error);
  }
}
