import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/entradas-livres/:id/cancelar
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const entrada = await entradaLivreService.cancelar(id);
    return NextResponse.json(entrada);
  } catch (error) {
    return handleError(error);
  }
}
