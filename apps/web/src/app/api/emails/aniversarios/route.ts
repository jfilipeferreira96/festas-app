import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { processarAniversariosProximos } from "@/services/marketing.service";

/**
 * POST /api/emails/aniversarios?dias=30
 * Processa os aniversários dos filhos dos clientes nos próximos `dias`
 * e envia o email de marketing (dedup por criança + ano).
 * Destinado a execução periódica (cron do alojamento ou botão manual).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const diasParam = Number(searchParams.get("dias"));
    const dias = Number.isFinite(diasParam) && diasParam > 0 ? diasParam : 30;
    const resultado = await processarAniversariosProximos(dias);
    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
