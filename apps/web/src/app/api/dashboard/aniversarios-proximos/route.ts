import { NextRequest, NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboard.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "Dashboard",
});

// GET /api/dashboard/aniversarios-proximos?dias=30
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const dias = searchParams.get("dias") ? parseInt(searchParams.get("dias") as string) : 30;

    const aniversarios = await dashboardService.getAniversariosProximos(dias);
    return NextResponse.json(aniversarios);
  } catch (error) {
    return handleError(error);
  }
}
