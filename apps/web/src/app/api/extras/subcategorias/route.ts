import { NextRequest, NextResponse } from "next/server";
import { extraService } from "@/services/extra.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "Extra",
});

// GET /api/extras/subcategorias — retorna subcategorias distintas para autocomplete
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const subcategorias = await extraService.getSubcategorias();
    return NextResponse.json(subcategorias);
  } catch (error) {
    return handleError(error);
  }
}
