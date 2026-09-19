import { NextRequest, NextResponse } from "next/server";
import prisma from "@festas/db";
import { validarTokenRemover } from "@/lib/email-unsubscribe";

/**
 * GET /api/emails/remover?email=...&token=...
 * Cancela as comunicações (marketing) de um cliente: marca optOut = true.
 * O token (HMAC do email) vem no rodapé dos emails de marketing.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const pagina = (titulo: string, texto: string, cor: string) =>
    new NextResponse(
      `<!DOCTYPE html>
<html lang="pt"><head><meta charset="utf-8"><title>${titulo}</title></head>
<body style="margin:0;padding:40px 20px;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:40px;text-align:center;">
    <h1 style="color:${cor};font-size:20px;margin:0 0 12px;">${titulo}</h1>
    <p style="color:#374151;font-size:15px;line-height:1.6;">${texto}</p>
  </div>
</body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );

  if (!email || !token || !validarTokenRemover(email, token)) {
    return pagina("Link inválido", "Este link de cancelamento não é válido ou expirou.", "#dc2626");
  }

  // MySQL collation é case-insensitive por defeito - não precisa de mode
  const cliente = await prisma.cliente.findFirst({ where: { email } });
  if (!cliente) {
    return pagina("Email não encontrado", `Não existe conta associada a ${email}.`, "#dc2626");
  }

  if (!cliente.optOut) {
    await prisma.cliente.update({ where: { id: cliente.id }, data: { optOut: true } });
  }

  return pagina(
    "Comunicações canceladas",
    `As comunicações de marketing para <strong>${email}</strong> foram canceladas.<br>Continuará a receber apenas emails essenciais da sua reserva.`,
    "#047857"
  );
}
