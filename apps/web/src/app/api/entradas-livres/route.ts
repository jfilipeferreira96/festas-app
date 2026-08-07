import { NextRequest, NextResponse } from "next/server";
import { entradaLivreService } from "@/services/entradaLivre.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../error-handler";

// GET /api/entradas-livres[?estado=&data=&dataInicio=&dataFim=&dataConclusao=&pesquisa=]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const filtros = {
      estado: searchParams.get("estado") || undefined,
      data: searchParams.get("data") || undefined,
      dataInicio: searchParams.get("dataInicio") || undefined,
      dataFim: searchParams.get("dataFim") || undefined,
      dataConclusao: searchParams.get("dataConclusao") || undefined,
      pesquisa: searchParams.get("pesquisa") || undefined,
    };
    const entradas = await entradaLivreService.list(filtros);
    return NextResponse.json(entradas);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/entradas-livres
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const entrada = await entradaLivreService.create(await request.json());
    return NextResponse.json(entrada, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PAGAMENTO_OBRIGATORIO") {
      return NextResponse.json(
        { error: "É obrigatório indicar o estado do pagamento" },
        { status: 400 }
      );
    }
    return handleError(error);
  }
}
