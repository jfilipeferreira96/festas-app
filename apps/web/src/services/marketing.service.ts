import prisma from "@festas/db";
import logger from "@/lib/logger";
import { isEmailConfigurado, sendEmail } from "@/lib/email";
import { linkRemover } from "@/lib/email-unsubscribe";

/**
 * Email de marketing - aniversário de um filho a aproximar-se.
 * Enviado quando falta <= ANTECEDENCIA_DIAS para a data (uma vez por ano,
 * dedup por aniversariante + ano). Respeita o optOut global do cliente.
 */

export const ANTECEDENCIA_DIAS = 30;
const MAX_TENTATIVAS = 3;

const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "";

export interface AniversarioInfo {
  encarregadoNome: string;
  criancaNome: string;
  idade: number;
  dataAniversario: Date;
  /** Email do destinatário - usado para o link de cancelamento. */
  email: string;
}

export function buildAniversarioHtml(info: AniversarioInfo): { assunto: string; html: string } {
  const dataFmt = new Date(info.dataAniversario).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
  });
  // Estilo idêntico ao email de boas-vindas (cor default, sem gradientes)
  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Aniversário do ${info.criancaNome}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 0.75rem; padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; }
    .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
    .title { font-size: 22px; font-weight: 600; color: #111827; margin: 0; }
    .text { font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px; }
    .button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 600; padding: 12px 24px; border-radius: 0.5rem; text-align: center; }
    .button:hover { background-color: #1d4ed8; }
    .footer { font-size: 14px; color: #6b7280; text-align: center; margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">O aniversário do ${info.criancaNome} está a chegar</h1>
    </div>
    <p class="text">Olá ${info.encarregadoNome},</p>
    <p class="text">
      Faltam poucos dias para o ${info.criancaNome} fazer <strong>${info.idade} anos</strong> (${dataFmt}).
      Que tal celebrar connosco uma festa sem preocupações?
    </p>
    <p class="text">
      A festa inclui sala privada, acesso ao parque para os convidados, menu e bolo de aniversário
      e um monitor dedicado. Nós tratamos de tudo - os pais só aproveitam!
    </p>
    <p class="text">
      As datas são limitadas - recomendamos reservar com antecedência para garantir o dia.
      Para reservar ou saber mais, contacte-nos ou visite a nossa plataforma.
    </p>
    <div class="footer">
      Recebeu este email porque tem uma conta associada ao nosso parque.<br>
      <a href="${linkRemover(info.email)}" style="color:#9ca3af;">Cancelar receção destas comunicações</a>
    </div>
  </div>
</body>
</html>`;

  return {
    assunto: `O aniversário do ${info.criancaNome} está a chegar - vamos festejar?`,
    html,
  };
}

/** Envia o email de aniversário para um cliente + criança específicos (uma vez por ano). */
export async function enfileirarEmailAniversario(
  clienteId: string,
  aniversarianteId: string,
  ano: number,
  info: AniversarioInfo
): Promise<{ enfileirado: boolean; motivo?: string }> {
  if (!isEmailConfigurado()) return { enfileirado: false, motivo: "SMTP não configurado" };

  const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) return { enfileirado: false, motivo: "CLIENTE_INEXISTENTE" };
  if (cliente.optOut) return { enfileirado: false, motivo: "OPT_OUT" };
  if (!cliente.email) return { enfileirado: false, motivo: "SEM_EMAIL" };

  const jaEnviado = await prisma.envioEmail.findFirst({
    where: { tipo: "ANIVERSARIO", aniversarianteId, anoReferencia: ano, estado: { in: ["PENDENTE", "ENVIADO", "FALHADO"] } },
  });
  if (jaEnviado) return { enfileirado: false, motivo: "JA_ENVIADO" };

  const { assunto, html } = buildAniversarioHtml({ ...info, email: cliente.email });
  const item = await prisma.envioEmail.create({
    data: { para: cliente.email, assunto, tipo: "ANIVERSARIO", aniversarianteId, anoReferencia: ano },
  });

  try {
    await sendEmail({ to: cliente.email, subject: assunto, html });
    await prisma.envioEmail.update({
      where: { id: item.id },
      data: { estado: "ENVIADO", tentativas: { increment: 1 } },
    });
    return { enfileirado: true };
  } catch (err) {
    await prisma.envioEmail.update({
      where: { id: item.id },
      data: {
        estado: "FALHADO",
        tentativas: { increment: 1 },
        ultimoErro: err instanceof Error ? err.message : String(err),
      },
    });
    return { enfileirado: true };
  }
}

/**
 * Percorre os aniversariantes com aniversário nos próximos `dias` (default 30)
 * e enfileira/envia o email de marketing (dedup por criança + ano).
 */
export async function processarAniversariosProximos(dias = ANTECEDENCIA_DIAS): Promise<{ enviados: number; ignorados: number }> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje.getTime() + dias * 24 * 60 * 60 * 1000);

  const aniversariantes = await prisma.aniversariante.findMany({
    include: { cliente: true },
  });

  let enviados = 0;
  let ignorados = 0;

  for (const anv of aniversariantes) {
    if (!anv.dataNascimento || !anv.cliente) continue;
    const nascimento = new Date(anv.dataNascimento);
    const proximo = new Date(nascimento);
    proximo.setFullYear(hoje.getFullYear());
    if (proximo < hoje) proximo.setFullYear(hoje.getFullYear() + 1);

    if (proximo < hoje || proximo > limite) {
      ignorados++;
      continue;
    }

    const idade = proximo.getFullYear() - nascimento.getFullYear();
    const info = {
      encarregadoNome: anv.cliente.nome,
      criancaNome: anv.nome,
      idade,
      dataAniversario: proximo,
      email: anv.cliente.email ?? "",
    };

    const res = await enfileirarEmailAniversario(anv.clienteId, anv.id, proximo.getFullYear(), info);
    if (res.enfileirado) enviados++;
    else ignorados++;
  }

  return { enviados, ignorados };
}
