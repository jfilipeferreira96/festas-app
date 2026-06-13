import { NextRequest, NextResponse } from "next/server";
import { clienteService } from "@/services/cliente.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "cliente.notFound",
    EMAIL_EXISTS: "cliente.emailExists",
    NOME_REQUIRED: "cliente.nomeRequired",
    EMAIL_REQUIRED: "cliente.emailRequired",
    TELEFONE_REQUIRED: "cliente.telefoneRequired",
    EMAIL_ALREADY_EXISTS: "cliente.emailExists",
    TELEFONE_ALREADY_EXISTS: "cliente.telefoneExists",
  },
  statusMap: {
    NOT_FOUND: 404,
    EMAIL_EXISTS: 409,
    NOME_REQUIRED: 400,
    EMAIL_REQUIRED: 400,
    TELEFONE_REQUIRED: 400,
    EMAIL_ALREADY_EXISTS: 409,
    TELEFONE_ALREADY_EXISTS: 409,
  },
  serviceName: "Cliente",
});

// GET /api/clientes[?search=|?pesquisa=&page=&pageSize=|?limit=]
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    if (search) {
      const clientes = await clienteService.search(search);
      return NextResponse.json(clientes);
    }

    const filtros = {
      pesquisa: searchParams.get("pesquisa") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page") as string) : undefined,
      pageSize: searchParams.get("pageSize")
        ? parseInt(searchParams.get("pageSize") as string)
        : searchParams.get("limit")
          ? parseInt(searchParams.get("limit") as string)
          : undefined,
    };
    const result = await clienteService.list(filtros);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/clientes
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { nome, email, telefone, contribuinte, codigoPostal, observacao } = await request.json();
    const cliente = await clienteService.create({
      nome,
      email,
      telefone,
      contribuinte,
      codigoPostal,
      observacao,
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
