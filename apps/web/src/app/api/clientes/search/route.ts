import { NextRequest, NextResponse } from "next/server";
import { clienteService } from "@/services/cliente.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "cliente.notFound",
  },
  statusMap: {
    NOT_FOUND: 404,
  },
  serviceName: "Cliente",
});

// GET /api/clientes/search?q=<query>
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const clientes = await clienteService.search(query);
    return NextResponse.json(clientes);
  } catch (error) {
    return handleError(error);
  }
}
