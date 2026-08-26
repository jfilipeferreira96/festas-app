import { NextRequest, NextResponse } from "next/server";
import { ajustePagamentoService } from "@/services/ajustePagamento.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "ajuste.notFound",
  },
  statusMap: {
    NOT_FOUND: 404,
  },
  serviceName: "AjustePagamento",
});

// DELETE /api/ajustes-pagamento/[id] — remove o ajuste e reverte o total
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const result = await ajustePagamentoService.remove(id);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
