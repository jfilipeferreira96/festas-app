import { NextResponse } from "next/server";
import { dbInfo } from "@festas/db";

/**
 * GET /api/db-info
 * Retorna info sobre a BD ativa. Apenas disponível em desenvolvimento.
 * Em produção retorna 404.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(dbInfo);
}