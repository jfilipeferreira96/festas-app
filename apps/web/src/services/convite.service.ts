import { readFile } from "node:fs/promises";
import path from "node:path";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import jpeg from "jpeg-js";
import {
  CONVITE_DIAS_LIMITE,
  CONVITE_TELEFONE,
  MESES_PT,
} from "@/lib/constants/convite";
import type { ModoConvite } from "@saas/shared-types";

/**
 * Geração do convite preenchido (assets/convite/convite.jpeg): sobrepõe os
 * dados da festa via SVG e renderiza com @resvg/resvg-wasm + jpeg-js - 100%
 * JS/WASM, sem binários nativos (compatível com qualquer cPanel/CloudLinux).
 * Sem Prisma/logger de propósito - módulo puro e reutilizável (testes/scripts).
 */

export interface DadosConvite {
  /** Nome(s) do(s) aniversariante(s). */
  nomes: string[];
  /** Data da festa (Date ou string "YYYY-MM-DD"). */
  dataFesta: Date | string;
  /** Hora de início "HH:MM". */
  horarioInicio: string;
  duracaoMinutos: number;
  /** JUNTO (default): um convite com todos os nomes; SEPARADO: um por criança. */
  modo?: ModoConvite | null;
}

/** Um convite gerado, pronto a anexar ao email. */
export interface ConviteGerado {
  filename: string;
  content: Buffer;
  contentType: "image/jpeg";
}

/** Fonte arredondada do design original (TTF commitado em assets/convite/fonts). */
const FONTE = { fontFamily: "Baloo 2", fontWeight: 700, cor: "#3a3b7a", ttf: "Baloo2-Bold.ttf" } as const;

/** Dimensões do template convite.jpeg. */
const IMG_W = 1600;
const IMG_H = 1131;

/** Largura útil do banner amarelo do título (para auto-encolher o nome). */
const BANNER_LARGURA = 690;

/** Posição (baseline) e tamanho base de cada campo por cima do template. */
const LAYOUT = {
  nome: { x: 790, y: 208, size: 64 },
  diaFesta: { x: 655, y: 492, size: 44 },
  mesFesta: { x: 975, y: 492, size: 44 },
  horaInicio: { x: 795, y: 560, size: 40 },
  horaFim: { x: 980, y: 560, size: 40 },
  diaLimite: { x: 646, y: 724, size: 40 },
  mesLimite: { x: 950, y: 724, size: 40 },
  telefone: { x: 935, y: 783, size: 32 },
} as const;

/** Data-limite de confirmação: data da festa - CONVITE_DIAS_LIMITE dias. */
export function calcularDataLimite(dataFesta: Date | string): Date {
  const d = new Date(dataFesta);
  d.setDate(d.getDate() - CONVITE_DIAS_LIMITE);
  return d;
}

/** Hora de fim "HH:MM" a partir do início + duração (dá a volta à meia-noite). */
export function calcularHoraFim(horarioInicio: string, duracaoMinutos: number): string {
  const [h, m] = horarioInicio.split(":").map(Number);
  const total = (((h || 0) * 60 + (m || 0) + duracaoMinutos) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Dia + mês por extenso (pt-PT, mês com maiúscula) de uma data. */
export function formatarDiaMes(data: Date | string): { dia: string; mes: string } {
  const d = new Date(data);
  const mes = MESES_PT[d.getMonth()] ?? "";
  return { dia: String(d.getDate()), mes: mes.charAt(0).toUpperCase() + mes.slice(1) };
}

/** Nº de contacto formatado para o convite: "(+351) 927 104 432". */
export function formatarTelefoneConvite(): string {
  return CONVITE_TELEFONE.replace(/^\+351\s?/, "(+351) ");
}

/** Junta os nomes dos aniversariantes com " e " (apara e ignora vazios). */
export function juntarNomes(nomes: string[]): string {
  return nomes
    .map((n) => (n ?? "").trim())
    .filter((n) => n.length > 0)
    .join(" e ");
}

/** Auto-encolhe o nome para caber no banner amarelo do título. */
export function tamanhoFonteNome(nome: string): number {
  const caracteres = Math.max(1, nome.length);
  const tamanho = BANNER_LARGURA / (caracteres * 0.52);
  return Math.round(Math.min(LAYOUT.nome.size, Math.max(34, tamanho)));
}

function escapeXml(texto: string): string {
  return texto
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function texto(
  campo: { x: number; y: number; size: number },
  conteudo: string
): string {
  return `<text x="${campo.x}" y="${campo.y}" text-anchor="middle" font-family="${FONTE.fontFamily}" font-weight="${FONTE.fontWeight}" font-size="${campo.size}" fill="${FONTE.cor}">${escapeXml(conteudo)}</text>`;
}

type AssetsConvite = { template: Buffer; font: Buffer };

let cacheAssets: AssetsConvite | null = null;
let wasmInit: Promise<void> | null = null;

async function carregarAssets(): Promise<AssetsConvite> {
  if (cacheAssets) return cacheAssets;

  const pasta = path.join(process.cwd(), "assets", "convite");
  const [template, font, wasm] = await Promise.all([
    readFile(path.join(pasta, "convite.jpeg")),
    readFile(path.join(pasta, "fonts", FONTE.ttf)),
    readFile(path.join(pasta, "resvg.wasm")),
  ]);
  // initWasm é idempotente-guardado: só corre uma vez por processo.
  wasmInit ??= initWasm(wasm);
  await wasmInit;

  cacheAssets = { template, font };
  return cacheAssets;
}

/** Constrói o SVG completo (template em base64 + campos preenchidos). */
export function construirSvgConvite(dados: DadosConvite, template: Buffer): string {
  const nome = juntarNomes(dados.nomes);
  const festa = formatarDiaMes(dados.dataFesta);
  const limite = formatarDiaMes(calcularDataLimite(dados.dataFesta));

  const campos = [
    texto({ ...LAYOUT.nome, size: tamanhoFonteNome(nome) }, nome),
    texto(LAYOUT.diaFesta, festa.dia),
    texto(LAYOUT.mesFesta, festa.mes),
    texto(LAYOUT.horaInicio, dados.horarioInicio),
    texto(LAYOUT.horaFim, calcularHoraFim(dados.horarioInicio, dados.duracaoMinutos)),
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

/** Gera o convite preenchido como JPEG (pronto para anexo de email). */
export async function gerarConviteJPEG(dados: DadosConvite): Promise<Buffer> {
  const { template, font } = await carregarAssets();

  const svg = construirSvgConvite(dados, template);
  const imagem = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: {
      // A build WASM não lê ficheiros do disco: a fonte passa em buffer.
      fontBuffers: [font],
      loadSystemFonts: false,
      defaultFontFamily: FONTE.fontFamily,
    },
  }).render();

  // pixels = RGBA (4 bytes/px) - o formato nativo do jpeg-js
  const resultado = jpeg.encode(
    { data: imagem.pixels, width: imagem.width, height: imagem.height },
    85
  );
  return Buffer.from(resultado.data);
}

/** Nome de ficheiro seguro a partir do nome da criança (ex.: "Ana Beatriz" → "ana-beatriz"). */
export function slugNome(nome: string): string {
  const slug = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "convite";
}

/**
 * Gera os convites da festa conforme o modo:
 * - JUNTO (ou modo não definido): 1 convite com todos os nomes ("Maria e João");
 * - SEPARADO: um convite por criança (convite-maria.jpeg, convite-joao.jpeg...).
 */
export async function gerarConvites(dados: DadosConvite): Promise<ConviteGerado[]> {
  const nomes = juntarNomes(dados.nomes).split(" e ");

  if (dados.modo === "SEPARADO" && nomes.length > 1) {
    const conteudos = await Promise.all(
      nomes.map((nome) => gerarConviteJPEG({ ...dados, nomes: [nome] }))
    );
    return conteudos.map((content, i) => ({
      filename: `convite-${slugNome(nomes[i])}.jpeg`,
      content,
      contentType: "image/jpeg" as const,
    }));
  }

  return [
    {
      filename: "convite.jpeg",
      content: await gerarConviteJPEG(dados),
      contentType: "image/jpeg",
    },
  ];
}
