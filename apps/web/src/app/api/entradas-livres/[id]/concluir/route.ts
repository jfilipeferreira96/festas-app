import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/entradas-livres/:id/concluir
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const entrada = await entradaLivreService.concluir(id, {
      custoExcessoManual: typeof body.custoExcesso === "number" ? body.custoExcesso : undefined,
    });
    return NextResponse.json(entrada);
  } catch (error) {
    return handleError(error);
  }
}
