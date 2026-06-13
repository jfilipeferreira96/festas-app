import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";

// GET /api/entradas-livres/contadores
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const contadores = await entradaLivreService.getContadores();
    return NextResponse.json(contadores);
  } catch (error) {
    return handleError(error);
  }
}
