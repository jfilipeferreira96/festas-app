import { NextRequest, NextResponse } from "next/server";
import { reservaService } from "@/services/reserva.service";
import { requireAuth } from "@/lib/auth-server";
import { handleError } from "../../error-handler";

type Params = { params: Promise<{ id: string }> };

// POST /api/reservas/:id/monitores
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { monitorId } = await request.json();
    const result = await reservaService.alocarMonitor(id, monitorId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/reservas/:id/monitores
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const { monitorId } = await request.json();
    const result = await reservaService.removerMonitor(id, monitorId);
    return NextResponse.json(result);
  } catch (error) {
    return handleError(error);
  }
}
