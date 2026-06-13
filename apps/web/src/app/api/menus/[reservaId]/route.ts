import { NextRequest, NextResponse } from "next/server";
import { menuService } from "@/services/menu.service";
import { requireAuth } from "@/lib/auth-server";
import { createRouteErrorHandler } from "@/lib/route-error";
import { t } from "@/lib/i18n-server";

const handleError = createRouteErrorHandler({
  errorMap: {
    NOT_FOUND: "menu.notFound",
    ALREADY_EXISTS: "menu.alreadyExists",
    RESERVA_NOT_FOUND: "menu.reservaNotFound",
    RESERVA_IN_PROGRESS: "menu.reservaInProgress",
  },
  statusMap: {
    NOT_FOUND: 404,
    ALREADY_EXISTS: 409,
    RESERVA_NOT_FOUND: 404,
    RESERVA_IN_PROGRESS: 400,
  },
  serviceName: "Menu",
});

type Params = { params: Promise<{ reservaId: string }> };

// GET /api/menus/:reservaId
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { reservaId } = await params;
    const menu = await menuService.getByReservaId(reservaId);
    return NextResponse.json(menu);
  } catch (error) {
    return handleError(error);
  }
}

// PUT /api/menus/:reservaId
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    const { reservaId } = await params;
    const { nome, preco, notas } = await request.json();
    const menu = await menuService.update(reservaId, { nome, preco, notas });
    return NextResponse.json({ message: t("menu.updatedSuccessfully"), data: menu });
  } catch (error) {
    return handleError(error);
  }
}
