import prisma from "@festas/db";
import logger from "@/lib/logger";
import { emailShell, escapeHtmlEmail, isEmailConfigurado, sendEmail, type SendEmailOptions } from "@/lib/email";
import { BOLO_LABELS } from "@/lib/constants/bolo";
import { configuracaoPrecoService } from "@/services/configuracaoPreco.service";
import { gerarConvites, type ConviteGerado } from "@/services/convite.service";

/**
 * Emails transacionais do app (SMTP do cPanel) com FILA simples (FASE 9):
 * 1. Enfileira em EnvioEmail (PENDENTE).
 * 2. Tenta enviar imediatamente (sucesso → ENVIADO; falha → FALHADO +
 *    tentativas/ultimoErro).
 * 3. reprocessarFilaEmails() volta a tentar PENDENTE/FALHADO com < MAX_TENTATIVAS.
 * Um falha de email NUNCA falha a operação de negócio.
 */

const MAX_TENTATIVAS = 3;

const euro = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

function linha(label: string, valor: string): string {
  return `<tr>
    <td style="padding:6px 0;color:#6b7280;font-size:13px;width:40%;">${escapeHtmlEmail(label)}</td>
    <td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600;">${valor}</td>
  </tr>`;
}

/** Seleção mínima da reserva necessária para construir o email. */
type ReservaParaEmail = {
  data: Date | string;
  horario: string;
  duracaoMinutos: number;
  caucao: string;
  valorCaucao: unknown;
  valorTotal: unknown;
  bolo: string | null;
  boloTema: string | null;
  numCriancas: number;
  numCriancasConfirmadas: number | null;
  modoConvite?: string | null;
  salaLanche: { nome: string } | null;
  cliente: { nome: string } | null;
  aniversariantes: { aniversariante: { nome: string } }[];
  extras: { extra: { nome: string }; quantidade: number }[];
  menu: { nome: string } | null;
};

/** Constrói assunto + HTML do email de confirmação da festa. */
export function buildReservaConfirmacaoHtml(
  reserva: ReservaParaEmail,
  dadosPagamento: string
): { assunto: string; html: string } {
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
    linha(
      "Hora",
      `${escapeHtmlEmail(reserva.horario)} (${Math.floor(reserva.duracaoMinutos / 60)}h${String(
        reserva.duracaoMinutos % 60
      ).padStart(2, "0")})`
    ),
    linha("Sala do Lanche", escapeHtmlEmail(reserva.salaLanche?.nome ?? "-")),
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
      ? [
          linha(
            "Bolo",
            escapeHtmlEmail(
              `${BOLO_LABELS[reserva.bolo] ?? reserva.bolo}${reserva.boloTema ? ` - ${reserva.boloTema}` : ""}`
            )
          ),
        ]
      : []),
    ...(valorCaucao > 0 ? [linha("Caução", escapeHtmlEmail(euro(valorCaucao)))] : []),
    ...(reserva.valorTotal != null
      ? [linha("Total da festa", escapeHtmlEmail(euro(Number(reserva.valorTotal))))]
      : []),
  ].join("");

  const blocoCaucao = cauCaoPaga
    ? `<div style="margin-top:20px;padding:14px 16px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;">
         <p style="margin:0;color:#047857;font-weight:700;">Reserva confirmada - caução recebida</p>
       </div>`
    : `<div style="margin-top:20px;padding:14px 16px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;">
         <p style="margin:0;color:#b45309;font-weight:700;">
           Falta pagar a caução${valorCaucao > 0 ? ` de ${euro(valorCaucao)}` : ""} para confirmar a reserva
         </p>
         ${
           dadosPagamento
             ? `<div style="margin-top:10px;color:#374151;font-size:14px;white-space:pre-wrap;">${escapeHtmlEmail(
                 dadosPagamento
               )}</div>`
             : ""
         }
       </div>`;

  const html = emailShell(
    "Confirmação de marcação de festa",
    `<p style="margin:0 0 14px;color:#374151;">Olá ${escapeHtmlEmail(
      reserva.cliente?.nome ?? ""
    )}, aqui está o resumo da festa marcada:</p>
     <table style="width:100%;border-collapse:collapse;">${linhasItens}</table>
     ${blocoCaucao}
     <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
       Para qualquer alteração, contacte-nos. Contamos consigo!
     </p>`
  );

  return {
    assunto: `Confirmação de marcação de festa - ${new Date(reserva.data).toLocaleDateString("pt-PT")}`,
    html,
  };
}

async function carregarReserva(reservaId: string) {
  const reserva = await prisma.reserva.findUnique({
    where: { id: reservaId },
    include: {
      salaLanche: { select: { nome: true } },
      cliente: true,
      aniversariantes: { include: { aniversariante: { select: { nome: true } } } },
      extras: { include: { extra: { select: { nome: true } } } },
      menu: { select: { nome: true } },
      pagamentos: { select: { valor: true, metodo: true } },
    },
  });
  if (!reserva) throw new Error("NOT_FOUND");
  return reserva;
}

/**
 * Devolve um convite JPEG da reserva (preview/download na rota admin).
 * `indice` escolhe a criança quando o modo é SEPARADO (0-based).
 */
export async function gerarConviteDaReserva(
  reservaId: string,
  indice = 0
): Promise<ConviteGerado> {
  const reserva = await carregarReserva(reservaId);
  const nomes = reserva.aniversariantes
    .map((a) => a.aniversariante.nome)
    .filter((n) => n && n.trim().length > 0);
  if (nomes.length === 0) throw new Error("SEM_ANIVERSARIANTE");

  const modo = reserva.modoConvite === "SEPARADO" ? "SEPARADO" : "JUNTO";
  const convites = await gerarConvites({
    nomes,
    dataFesta: reserva.data,
    horarioInicio: reserva.horario,
    duracaoMinutos: reserva.duracaoMinutos,
    modo,
  });

  const escolhido = convites[indice] as ConviteGerado | undefined;
  if (!escolhido) throw new Error("CONVITE_INDICE_INVALIDO");
  return escolhido;
}

/** Envia o conteúdo de um item da fila. Lança em falha (o caller marca FALHADO). */
async function enviarItem(
  item: { para: string; assunto: string; html: string },
  attachments?: SendEmailOptions["attachments"]
): Promise<void> {
  await sendEmail({ to: item.para, subject: item.assunto, html: item.html, attachments });
}

/**
 * Anexo(s) do convite: JUNTO → 1 convite com todos os nomes; SEPARADO →
 * um convite por criança. Lista vazia se não houver aniversariante.
 */
async function gerarAnexosConvite(reserva: ReservaParaEmail): Promise<SendEmailOptions["attachments"]> {
  const nomes = reserva.aniversariantes
    .map((a) => a.aniversariante.nome)
    .filter((n) => n && n.trim().length > 0);
  if (nomes.length === 0) return [];

  const modo = reserva.modoConvite === "SEPARADO" ? "SEPARADO" : "JUNTO";
  const convites = await gerarConvites({
    nomes,
    dataFesta: reserva.data,
    horarioInicio: reserva.horario,
    duracaoMinutos: reserva.duracaoMinutos,
    modo,
  });
  return convites.map(({ filename, content, contentType }) => ({ filename, content, contentType }));
}

/**
 * Enfileira o email de confirmação da reserva e tenta enviar imediatamente.
 * O convite preenchido (convite.jpeg) vai como anexo; falha na geração do
 * convite NUNCA impede o envio do email (segue sem anexo).
 */
export async function enfileirarEmailConfirmacaoReserva(reservaId: string): Promise<void> {
  if (!isEmailConfigurado()) {
    logger.info("Email de confirmação ignorado - SMTP não configurado", { reservaId });
    return;
  }

  const reserva = await carregarReserva(reservaId);
  const email = reserva.cliente?.email;
  if (!email || reserva.cliente?.optOut === true) {
    logger.info("Email de confirmação ignorado - cliente sem email ou optOut", { reservaId });
    return;
  }

  const config = await configuracaoPrecoService.getConfig();
  const { assunto, html } = buildReservaConfirmacaoHtml(reserva, config?.dadosPagamento ?? "");

  let attachments: SendEmailOptions["attachments"];
  try {
    attachments = (await gerarAnexosConvite(reserva)) || undefined;
  } catch (err) {
    logger.warn("Convite(s) não gerado(s) - email de confirmação segue sem anexo", {
      reservaId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const item = await prisma.envioEmail.create({
    data: { para: email, assunto, tipo: "RESERVA_CONFIRMACAO", reservaId },
  });

  try {
    await enviarItem({ para: email, assunto, html }, attachments);
    await prisma.envioEmail.update({
      where: { id: item.id },
      data: { estado: "ENVIADO", tentativas: { increment: 1 } },
    });
    logger.info("Email de confirmação de reserva enviado", { reservaId, email });
  } catch (err) {
    await prisma.envioEmail.update({
      where: { id: item.id },
      data: {
        estado: "FALHADO",
        tentativas: { increment: 1 },
        ultimoErro: err instanceof Error ? err.message : String(err),
      },
    });
    logger.error("Email de confirmação na fila FALHADO (será reprocessado)", {
      reservaId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Reprocessa a fila: PENDENTE/FALHADO com tentativas < MAX_TENTATIVAS.
 * Retorna o número de emails enviados com sucesso nesta passagem.
 */
export async function reprocessarFilaEmails(): Promise<number> {
  if (!isEmailConfigurado()) return 0;

  const pendentes = await prisma.envioEmail.findMany({
    where: {
      estado: { in: ["PENDENTE", "FALHADO"] },
      tentativas: { lt: MAX_TENTATIVAS },
    },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  if (pendentes.length === 0) return 0;

  let enviados = 0;
  for (const item of pendentes) {
    try {
      let html = "";
      let attachments: SendEmailOptions["attachments"];
      if (item.tipo === "RESERVA_CONFIRMACAO" && item.reservaId) {
        const reserva = await carregarReserva(item.reservaId);
        const config = await configuracaoPrecoService.getConfig();
        html = buildReservaConfirmacaoHtml(reserva, config?.dadosPagamento ?? "").html;
        // O anexo é regenerado a cada tentativa (nada persistido em BD).
        try {
          attachments = (await gerarAnexosConvite(reserva)) || undefined;
        } catch (err) {
          logger.warn("Convite(s) não regenerado(s) no retry - email segue sem anexo", {
            reservaId: item.reservaId,
            err: err instanceof Error ? err.message : String(err),
          });
        }
      }
      if (!html) {
        // Sem conteúdo reconstrutível (ex.: reserva apagada) - marcar como enviado
        await prisma.envioEmail.update({
          where: { id: item.id },
          data: { estado: "ENVIADO", tentativas: { increment: 1 }, ultimoErro: null },
        });
        continue;
      }
      await enviarItem({ para: item.para, assunto: item.assunto, html }, attachments);
      await prisma.envioEmail.update({
        where: { id: item.id },
        data: { estado: "ENVIADO", tentativas: { increment: 1 }, ultimoErro: null },
      });
      enviados++;
    } catch (err) {
      await prisma.envioEmail.update({
        where: { id: item.id },
        data: {
          estado: "FALHADO",
          tentativas: { increment: 1 },
          ultimoErro: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  if (enviados > 0) logger.info("Fila de emails reprocessada", { enviados });
  return enviados;
}

/** Nº de emails na fila ainda não enviados (alerta na dashboard). */
export async function contarEmailsPorEnviar(): Promise<number> {
  return prisma.envioEmail.count({
    where: { estado: { in: ["PENDENTE", "FALHADO"] }, tentativas: { lt: MAX_TENTATIVAS } },
  });
}
