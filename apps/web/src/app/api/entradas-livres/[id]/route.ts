import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";

type Params = { params: Promise<{ id: string }> };

// GET /api/entradas-livres/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const entrada = await entradaLivreService.getById(id);
    return NextResponse.json(entrada);
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/entradas-livres/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const entrada = await entradaLivreService.atualizar(id, await request.json());
    return NextResponse.json(entrada);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/entradas-livres/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const result = await entradaLivreService.eliminar(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
