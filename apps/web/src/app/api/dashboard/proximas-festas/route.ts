import { NextRequest, NextResponse } from "next/server";
import { dashboardService } from "@/services/dashboard.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";

const handleError = createRouteErrorHandler({
  errorMap: {},
  statusMap: {},
  serviceName: "Dashboard",
});

// GET /api/dashboard/proximas-festas
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const festas = await dashboardService.getProximasFestas();
    return NextResponse.json(festas);
  } catch (error) {
    return handleError(error);
  }
}
