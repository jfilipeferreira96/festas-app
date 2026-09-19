import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { reprocessarFilaEmails, contarEmailsPorEnviar } from "@/services/email.service";

// POST /api/emails/reprocessar - tenta reenviar emails PENDENTE/FALHADO
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const enviados = await reprocessarFilaEmails();
    const porEnviar = await contarEmailsPorEnviar();
    return NextResponse.json({ enviados, porEnviar });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// GET /api/emails/reprocessar - apenas consulta quantos estão por enviar
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const porEnviar = await contarEmailsPorEnviar();
    return NextResponse.json({ porEnviar });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
