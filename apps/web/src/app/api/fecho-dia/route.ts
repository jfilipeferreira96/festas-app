import { NextRequest, NextResponse } from "next/server";
import { fechoDiaService } from "@/services/fechoDia.service";

/**
 * POST /api/fecho-dia
 * Fecho automático de fim de dia: fecha as festas do dia e liberta cacifos.
 * Autorização: header x-fecho-secret com o valor de FECHO_DIA_SECRET (.env)
 * - pensado para o cron do cPanel (scripts/fecho-dia.sh).
 * Body opcional: { "data": "YYYY-MM-DD" } (por omissão = hoje).
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-fecho-secret");
  const secretConfigurado = process.env.FECHO_DIA_SECRET;

  if (!secretConfigurado || secret !== secretConfigurado) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const resultado = await fechoDiaService.fecharDia(body?.data);
    return NextResponse.json({
      message: "Fecho do dia concluído.",
      data: resultado,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro no fecho do dia" },
      { status: 500 }
    );
  }
}
