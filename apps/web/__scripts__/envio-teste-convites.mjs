#!/usr/bin/env node
/**
 * TESTE DE ENVIO - Convites preenchidos por email (cPanel).
 *
 * Gera e envia para o TEU email 3 emails de teste, usando o mesmo SMTP
 * da app (SMTP_HOST/SMTP_PORT/SMTP_SECURE/SMTP_USER/SMTP_PASS):
 *   1) CONVITE NORMAL  - uma criança (primeiro + último nome) → convite.jpeg
 *   2) CONVITE DUPLO   - duas crianças no mesmo convite       → convite.jpeg
 *   3) CONVITES SEPARADOS - um anexo por criança              → convite-maria-silva.jpeg, convite-joao-pereira.jpeg
 *
 * Destinatário: TESTE_EMAIL_PARA (env) ou, em fallback, EMAIL_FROM_ADDRESS / SMTP_USER.
 * Correr a partir da pasta da app (onde estão node_modules e assets/convite):
 *   node __scripts__/envio-teste-convites.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import jpeg from "jpeg-js";

// Carrega o .env da app — procura em vários locais prováveis (cPanel):
//   ENV_PATH (env) · <app>/apps/web/.env · <app>/.env · ./ .env
// Onde <app> = pasta acima de scripts/ (~/app.baselandia.pt).
const DRY_RUN = process.env.DRY_RUN === "1";
const __dirname = dirname(fileURLToPath(import.meta.url));
(() => {
  const appRoot = path.resolve(__dirname, "..");
  const candidatos = [
    process.env.ENV_PATH,
    path.join(appRoot, "apps", "web", ".env"),
    path.join(appRoot, ".env"),
    path.join(process.cwd(), ".env"),
  ].filter(Boolean);

  for (const envPath of candidatos) {
    if (!existsSync(envPath)) continue;
    for (const linha of readFileSync(envPath, "utf8").split("\n")) {
      const m = linha.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
    console.log(`ENV carregado de: ${envPath}`);
    return;
  }
  console.warn(`⚠️  Nenhum .env encontrado (procurei em: ${candidatos.join(", ")})`);
})();

// ── Config (env; no dev lê o .env acima) ────────────────────────────────
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 465);
const smtpSecure = (process.env.SMTP_SECURE || "true") === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromAddress = process.env.EMAIL_FROM_ADDRESS || smtpUser || "noreply@example.com";
const fromName = process.env.EMAIL_FROM_NAME || "Baselandia - Festas";
const PARA = process.env.TESTE_EMAIL_PARA || process.env.EMAIL_FROM_ADDRESS || smtpUser;

if (!DRY_RUN && (!smtpHost || !smtpUser || !smtpPass)) {
  console.error("[x] SMTP não configurado — faltam SMTP_HOST/SMTP_USER/SMTP_PASS.");
  console.error("    O .env carregado não tem essas variáveis (ou não foi encontrado).");
  console.error("    Para ver que variáveis existem (só os NOMES, sem valores):");
  console.error('      grep -oE "^[A-Z_]+" ~/app.baselandia.pt/apps/web/.env | sort');
  console.error("    E/ou define-as inline: SMTP_HOST=... SMTP_USER=... SMTP_PASS=... TESTE_EMAIL_PARA=... node scripts/envio-teste-convites.mjs");
  process.exit(1);
}
if (!DRY_RUN && !PARA) {
  console.error("[x] Destinatário em falta: define TESTE_EMAIL_PARA (ou EMAIL_FROM_ADDRESS/SMTP_USER).");
  process.exit(1);
}

// ── Constantes do convite (espelham src/services/convite.service.ts) ────
const FONTE = { fontFamily: "Baloo 2", fontWeight: 700, cor: "#3a3b7a", ttf: "Baloo2-Bold.ttf" };
const IMG_W = 1600;
const IMG_H = 1131;
const BANNER_LARGURA = 690;
const CONVITE_DIAS_LIMITE = 2;
const CONVITE_TELEFONE = "+351 927 104 432";
const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const LAYOUT = {
  nome: { x: 790, y: 208, size: 64 },
  diaFesta: { x: 655, y: 492, size: 44 },
  mesFesta: { x: 975, y: 492, size: 44 },
  horaInicio: { x: 795, y: 560, size: 40 },
  horaFim: { x: 980, y: 560, size: 40 },
  diaLimite: { x: 646, y: 724, size: 40 },
  mesLimite: { x: 950, y: 724, size: 40 },
  telefone: { x: 935, y: 783, size: 32 },
};

// ── Helpers (espelham o serviço) ────────────────────────────────────────
const escapeXml = (t) => String(t).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&apos;");
const juntarNomes = (nomes) => nomes.map((n) => (n ?? "").trim()).filter((n) => n.length > 0).join(" e ");
const tamanhoFonteNome = (nome) => Math.round(Math.min(LAYOUT.nome.size, Math.max(34, BANNER_LARGURA / (Math.max(1, nome.length) * 0.52))));
const formatarTelefoneConvite = () => CONVITE_TELEFONE.replace(/^\+351\s?/, "(+351) ");
const slugNome = (nome) => nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "convite";

function formatarDiaMes(data) {
  const d = new Date(data);
  const mes = MESES_PT[d.getMonth()] ?? "";
  return { dia: String(d.getDate()), mes: mes.charAt(0).toUpperCase() + mes.slice(1) };
}
function calcularDataLimite(dataFesta) {
  const d = new Date(dataFesta);
  d.setDate(d.getDate() - CONVITE_DIAS_LIMITE);
  return d;
}
function calcularHoraFim(horarioInicio, duracaoMinutos) {
  const [h, m] = horarioInicio.split(":").map(Number);
  const total = (((h || 0) * 60 + (m || 0) + duracaoMinutos) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
const texto = (campo, conteudo) =>
  `<text x="${campo.x}" y="${campo.y}" text-anchor="middle" font-family="${FONTE.fontFamily}" font-weight="${FONTE.fontWeight}" font-size="${campo.size}" fill="${FONTE.cor}">${escapeXml(conteudo)}</text>`;

function construirSvg(nomes, dataFesta, horarioInicio, duracaoMinutos, template) {
  const nome = juntarNomes(nomes);
  const festa = formatarDiaMes(dataFesta);
  const limite = formatarDiaMes(calcularDataLimite(dataFesta));
  const campos = [
    texto({ ...LAYOUT.nome, size: tamanhoFonteNome(nome) }, nome),
    texto(LAYOUT.diaFesta, festa.dia),
    texto(LAYOUT.mesFesta, festa.mes),
    texto(LAYOUT.horaInicio, horarioInicio),
    texto(LAYOUT.horaFim, calcularHoraFim(horarioInicio, duracaoMinutos)),
    texto(LAYOUT.diaLimite, limite.dia),
    texto(LAYOUT.mesLimite, limite.mes),
    texto(LAYOUT.telefone, formatarTelefoneConvite()),
  ].join("");
  const bg = template.toString("base64");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${IMG_W}" height="${IMG_H}" viewBox="0 0 ${IMG_W} ${IMG_H}">
  <image x="0" y="0" width="${IMG_W}" height="${IMG_H}" href="data:image/jpeg;base64,${bg}" xlink:href="data:image/jpeg;base64,${bg}"/>
  <g>${campos}</g>
</svg>`;
}

let wasmPronto = false;

async function gerarConviteJPEG(nomes, { dataFesta, horarioInicio, duracaoMinutos }) {
  const pasta = path.join(process.cwd(), "assets", "convite");
  const [template, font] = await Promise.all([
    readFile(path.join(pasta, "convite.jpeg")),
    readFile(path.join(pasta, "fonts", FONTE.ttf)),
  ]);
  if (!wasmPronto) {
    await initWasm(await readFile(path.join(pasta, "resvg.wasm")));
    wasmPronto = true;
  }
  const svg = construirSvg(nomes, dataFesta, horarioInicio, duracaoMinutos, template);
  const imagem = new Resvg(svg, {
    fitTo: { mode: "original" },
    // A build WASM não lê ficheiros do disco: a fonte passa em buffer.
    font: { fontBuffers: [font], loadSystemFonts: false, defaultFontFamily: FONTE.fontFamily },
  }).render();
  // pixels RGBA → JPEG puro em JS (sem binários nativos)
  return Buffer.from(jpeg.encode({ data: imagem.pixels, width: imagem.width, height: imagem.height }, 85).data);
}

// ── Email (espelha src/lib/email.ts) ────────────────────────────────────
function emailShell(titulo, conteudoHtml) {
  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="utf-8"><title>${escapeXml(titulo)}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <div style="background:#465fff;color:#ffffff;padding:20px 24px;">
        <h1 style="margin:0;font-size:20px;">${escapeXml(titulo)}</h1>
      </div>
      <div style="padding:24px;">${conteudoHtml}</div>
      <div style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
        Email de TESTE do sistema de convites. Não responda.
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function enviarEmail({ to, subject, html, attachments }) {
  if (DRY_RUN) {
    // Guarda os anexos para inspeção visual sem enviar.
    const destino = process.env.CONVITE_AMOSTRAS_DESTINO || "/tmp/kilo/convite-amostras";
    await mkdir(destino, { recursive: true });
    for (const a of attachments) {
      await writeFile(path.join(destino, a.filename), a.content);
    }
    const anexos = attachments.map((a) => `${a.filename} (${Math.round(a.content.length / 1024)} KB)`).join(", ");
    console.log(`  [DRY_RUN] não enviado → ${to} · anexos: ${anexos} (em ${destino})`);
    return "dry-run";
  }
  const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpSecure, auth: { user: smtpUser, pass: smtpPass } });
  const info = await transporter.sendMail({ from: `"${fromName}" <${fromAddress}>`, to, subject, html, attachments });
  if (info.rejected?.length > 0) throw new Error(`SMTP rejeitou: ${info.rejected.join(", ")}`);
  return info.messageId;
}

// ── Cenários de teste ───────────────────────────────────────────────────
const DADOS = { dataFesta: "2026-06-12", horarioInicio: "14:00", duracaoMinutos: 135 };

async function main() {
  console.log(DRY_RUN ? "DRY_RUN: valida a geração, não envia." : `A enviar testes para: ${PARA}`);
  const transporterInfo = `SMTP ${smtpHost}:${smtpPort}`;

  // 1) CONVITE NORMAL - primeiro + último nome da criança
  {
    const content = await gerarConviteJPEG(["Maria Silva"], DADOS);
    const id = await enviarEmail({
      to: PARA,
      subject: "[TESTE 1/3] Convite normal - Maria Silva",
      html: emailShell("Teste 1 - Convite normal", "<p>Uma criança (primeiro + último nome). Anexo: <strong>convite.jpeg</strong>.</p>"),
      attachments: [{ filename: "convite.jpeg", content, contentType: "image/jpeg" }],
    });
    console.log(`[ok] 1/3 convite normal (${Math.round(content.length / 1024)} KB) - ${transporterInfo} - id ${id}`);
  }

  // 2) CONVITE DUPLO - duas crianças no mesmo convite
  {
    const content = await gerarConviteJPEG(["Maria Silva", "João Pereira"], DADOS);
    const id = await enviarEmail({
      to: PARA,
      subject: "[TESTE 2/3] Convite duplo - Maria e João",
      html: emailShell("Teste 2 - Convite duplo", "<p>Modo JUNTO: dois nomes no mesmo convite. Anexo: <strong>convite.jpeg</strong>.</p>"),
      attachments: [{ filename: "convite.jpeg", content, contentType: "image/jpeg" }],
    });
    console.log(`[ok] 2/3 convite duplo (${Math.round(content.length / 1024)} KB) - id ${id}`);
  }

  // 3) CONVITES SEPARADOS - um anexo por criança
  {
    const criancas = ["Maria Silva", "João Pereira"];
    const attachments = [];
    for (const nome of criancas) {
      const content = await gerarConviteJPEG([nome], DADOS);
      attachments.push({ filename: `convite-${slugNome(nome)}.jpeg`, content, contentType: "image/jpeg" });
    }
    const id = await enviarEmail({
      to: PARA,
      subject: "[TESTE 3/3] Convites separados - 2 anexos",
      html: emailShell("Teste 3 - Convites separados", `<p>Modo SEPARADO: um convite por criança. Anexos: ${attachments.map((a) => `<strong>${escapeXml(a.filename)}</strong>`).join(", ")}.</p>`),
      attachments,
    });
    console.log(`[ok] 3/3 convites separados (${attachments.length} anexos) - id ${id}`);
  }

  console.log("Todos os testes enviados com sucesso.");
}

main().catch((err) => {
  console.error("[x] Falha:", err instanceof Error ? err.message : err);
  process.exit(1);
});
