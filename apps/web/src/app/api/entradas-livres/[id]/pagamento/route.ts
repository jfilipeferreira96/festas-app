import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/entradas-livres/:id/pagamento
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const entrada = await entradaLivreService.atualizarPagamento(id, await request.json());
    return NextResponse.json(entrada);
  } catch (error) {
    // Validação: não permitir marcar como paga sem método de pagamento
    if (error instanceof Error && error.message === "METODO_PAGAMENTO_REQUIRED") {
      return NextResponse.json(
        { error: "Tem de indicar o método de pagamento para marcar como paga." },
        { status: 400 },
      );
    }
    return handleError(error);
  }
}
