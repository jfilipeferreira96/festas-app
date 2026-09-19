import prisma from "@festas/db";
import logger from "@/lib/logger";
import { emailShell, escapeHtmlEmail, isEmailConfigurado, sendEmail } from "@/lib/email";
import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";

/**
 * Emails transacionais do app (MailJet).
 * O envio é SEMPRE fire-and-forget: um falha de email NUNCA falha a operação
 * de negócio (criação de reserva, etc.).
 */

const euro = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

function linha(label: string, valor: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;width:40%;">${escapeHtmlEmail(label)}</td>
    <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${valor}</td>
  </tr>`;
}

/**
 * Email de confirmação da marcação de festa: resumo de tudo o que foi
 * marcado + estado da caução (paga → "reserva confirmada"; não paga →
 * dados de pagamento da configuração).
 */
export async function enviarEmailConfirmacaoReserva(reservaId: string): Promise<void> {
  if (!isEmailConfigurado()) {
    logger.info("Email de confirmação ignorado - MailJet não configurado", { reservaId });
    return;
  }

  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: {
      local: { select: { nome: true } },
      cliente: true,
      aniversariantes: { include: { aniversariante: { select: { nome: true } } } },
      extras: { include: { extra: { select: { nome: true } } } },
      menu: { select: { nome: true } },
      pagamentos: { select: { valor: true, metodo: true } },
    },
  });
  if (!reserva) throw new Error("NOT_FOUND");

  const email = reserva.cliente?.email;
  if (!email) {
    logger.info("Email de confirmação ignorado - cliente sem email", { reservaId });
    return;
  }

  const config = await configuracaoPrecoService.getConfig();
  const dadosPagamento = config?.dadosPagamento ?? "";

  const cauCaoPaga = reserva.caucao === "PAGA" || reserva.caucao === "PAGA_NO_DIA";
  const valorCaucao = reserva.valorCaucao != null ? Number(reserva.valorCaucao) : 0;
  const dataFmt = new Date(reserva.data).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const linhasItens = [
    linha("Data", escapeHtmlEmail(dataFmt)),
    linha("Hora", `${escapeHtmlEmail(reserva.horario)} (${Math.floor(reserva.duracaoMinutos / 60)}h${String(reserva.duracaoMinutos % 60).padStart(2, "0")})`),
    linha("Sala", escapeHtmlEmail(reserva.local?.nome ?? "-")),
    linha(
      "Aniversariante(s)",
      escapeHtmlEmail(reserva.aniversariantes.map((a) => a.aniversariante.nome).join(", ") || "-")
    ),
    ...(reserva.numCriancasConfirmadas || reserva.numCriancas
      ? [linha("Nº de crianças", escapeHtmlEmail(reserva.numCriancasConfirmadas || reserva.numCriancas))]
      : []),
    ...(reserva.menu ? [linha("Menu", escapeHtmlEmail(reserva.menu.nome))] : []),
    ...(reserva.extras.length > 0
      ? [
          linha(
            "Extras",
            escapeHtmlEmail(reserva.extras.map((e) => `${e.extra.nome} ×${e.quantidade}`).join(", "))
          ),
        ]
      : []),
    ...(reserva.bolo
      ? [linha("Bolo", escapeHtmlEmail(`${reserva.bolo}${reserva.boloTema ? ` — ${reserva.boloTema}` : ""}`))]
      : []),
    ...(valorCaucao > 0 ? [linha("Caução", escapeHtmlEmail(euro(valorCaucao)))] : []),
    ...(reserva.valorTotal != null ? [linha("Total da festa", escapeHtmlEmail(euro(Number(reserva.valorTotal))))] : []),
  ].join("");

  const blocoCaucao = cauCaoPaga
    ? `<div style="margin-top:20px;padding:14px 16px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;">
         <p style="margin:0;color:#047857;font-weight:700;">✅ Reserva confirmada — caução recebida</p>
       </div>`
    : `<div style="margin-top:20px;padding:14px 16px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;">
         <p style="margin:0;color:#b45309;font-weight:700;">
           ⚠️ Falta pagar a caução${valorCaucao > 0 ? ` de ${euro(valorCaucao)}` : ""} para confirmar a reserva
         </p>
         ${dadosPagamento ? `<div style="margin-top:10px;color:#374151;font-size:14px;white-space:pre-wrap;">${escapeHtmlEmail(dadosPagamento)}</div>` : ""}
       </div>`;

  const html = emailShell(
    "Confirmação de marcação de festa",
    `<p style="margin:0 0 14px;color:#374151;">Olá ${escapeHtmlEmail(reserva.cliente?.nome ?? "")}, aqui está o resumo da festa marcada:</p>
     <table style="width:100%;border-collapse:collapse;">${linhasItens}</table>
     ${blocoCaucao}
     <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
       Qualquer alteração, contacte-nos. Esperamos por vocês! 🎉
     </p>`
  );

  await sendEmail({
    to: email,
    subject: `Confirmação de marcação de festa — ${new Date(reserva.data).toLocaleDateString("pt-PT")}`,
    html,
  });

  logger.info("Email de confirmação de reserva enviado", { reservaId, email });
}
