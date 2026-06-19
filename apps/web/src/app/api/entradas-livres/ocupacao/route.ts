import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";

// GET /api/entradas-livres/ocupacao?localId=&excludeId=
// Verifica se o local está ocupado AGORA (festas EM_CURSO + entradas ATIVAS).
// Aviso apenas (warn-only) — nunca bloqueia a criação/edição.
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const localId = searchParams.get("localId") || undefined;
    const excludeId = searchParams.get("excludeId") || undefined;
    const numCriancas = searchParams.get("numCriancas");

    // Sem local definido, considera dentro da capacidade
    if (!localId) {
      return NextResponse.json({ disponivel: true, excedeCapacidade: false });
    }

    const resultado = await entradaLivreService.checkOcupacaoLocal(
      localId,
      numCriancas ? Number(numCriancas) : 0,
      excludeId || undefined
    );
    return NextResponse.json(resultado);
  } catch (error) {
    return handleError(error);
  }
}
