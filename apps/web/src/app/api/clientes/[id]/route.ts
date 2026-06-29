import { NextRequest, NextResponse } from "next/server";
import { clienteService } from "@/services/cliente.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

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

type Params = { params: Promise<{ id: string }> };

// GET /api/clientes/:id
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const cliente = await clienteService.getById(id);
    return NextResponse.json(cliente);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/clientes/:id
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { nome, email, telefone, contribuinte, codigoPostal, observacao, aniversariantes } =
      await request.json();
    const cliente = await clienteService.update(id, {
      nome,
      email,
      telefone,
      contribuinte,
      codigoPostal,
      observacao,
      aniversariantes,
    });
    return NextResponse.json(cliente);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/clientes/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    await clienteService.delete(id);
    return NextResponse.json({ message: t("cliente.deleted") });
  } catch (error) {
    return handleError(error);
  }
}
