import { formatDate } from "@/utils/date";

// ── Tipos mínimos para a impressão ────────────────────────────────
// Usamos tipos estruturais (duck-typing) para que a função aceite
// tanto a Reserva da API como qualquer objecto com os mesmos campos.

interface ReservaPrintInfo {
  aniversariantes?: Array<{ aniversariante: { nome: string } }>;
  data?: string | Date;
  horario?: string;
  local?: { nome?: string } | null;
  notasCacifos?: string | null;
}

interface CacifoPrintInfo {
  numero: number;
  criancas?: string | null;
  notas?: string | null;
}

interface CriancaPrintItem {
  nome: string;
  cacifo?: number;
  notas?: string;
}

/**
 * Extrai todas as crianças a partir dos cacifos e aniversariantes.
 * Cada criança inclui o nº do cacifo associado (se existir) e as
 * respectivas notas/observações.
 */
function extrairCriancas(
  reserva: ReservaPrintInfo,
  cacifos: CacifoPrintInfo[]
): CriancaPrintItem[] {
  const itens: CriancaPrintItem[] = [];
  const nomesVistos = new Set<string>();

  // 1. Crianças dos cacifos (crianças presentes na festa)
  for (const cacifo of cacifos) {
    if (!cacifo.criancas || cacifo.criancas === "Por preencher") continue;
    const separados = cacifo.criancas
      .split(/[,;\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    for (const nome of separados) {
      if (nomesVistos.has(nome)) continue;
      nomesVistos.add(nome);
    
      const notaFinal =
        cacifo.notas?.trim() ||
        reserva.notasCacifos?.trim() ||
        undefined;
      itens.push({
        nome,
        cacifo: cacifo.numero,
        notas: notaFinal,
      });
    }
  }

  // 2. Se não há cacifos preenchidos, usar os aniversariantes
  if (itens.length === 0 && reserva.aniversariantes) {
    for (const a of reserva.aniversariantes) {
      const nome = a.aniversariante.nome?.trim();
      if (nome && !nomesVistos.has(nome)) {
        nomesVistos.add(nome);
        itens.push({ nome });
      }
    }
  }

  return itens;
}

/** Verifica se pelo menos uma criança tem cacifo associado. */
function temCacifos(itens: CriancaPrintItem[]): boolean {
  return itens.some((c) => c.cacifo != null);
}

const ENT_AMP = String.fromCharCode(38) + "amp;";
const ENT_LT = String.fromCharCode(38) + "lt;";
const ENT_GT = String.fromCharCode(38) + "gt;";
const ENT_QUOT = String.fromCharCode(38) + "quot;";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, ENT_AMP)
    .replace(/</g, ENT_LT)
    .replace(/>/g, ENT_GT)
    .replace(/\x22/g, ENT_QUOT);
}

// ── Impressão Lista de Crianças ──────────────────────────────────
/**
 * Abre uma nova janela com uma lista simples e limpa dos nomes das
 * crianças da festa, pronta a imprimir.
 * Inclui colunas de cacifo associado e notas quando existirem.
 */
export function imprimirListaConvidados(
  reserva: ReservaPrintInfo,
  cacifos: CacifoPrintInfo[],
  titulo?: string
): void {
  const itens = extrairCriancas(reserva, cacifos);
  const anvNomes =
    reserva.aniversariantes
      ?.map((a) => a.aniversariante.nome)
      .join(", ") || "—";
  const data = formatDate(reserva.data ? String(reserva.data) : "");
  const total = itens.length;

  const mostrarCacifo = temCacifos(itens);

  const linhasHtml = itens
    .map((item, i) => {
      const colunas: string[] = [
        `<td style="border:1px solid #bbb;padding:8px 12px;font-weight:600;width:40px;text-align:center;color:#555;">${i + 1}</td>`,
        `<td style="border:1px solid #bbb;padding:8px 12px;font-size:15px;">${escapeHtml(item.nome)}</td>`,
      ];
      if (mostrarCacifo) {
        colunas.push(
          `<td style="border:1px solid #bbb;padding:8px 12px;text-align:center;width:70px;color:#666;">${item.cacifo != null ? "#" + item.cacifo : "—"}</td>`
        );
      }
      // Coluna de Notas — sempre visível (espaço para escrita manual)
      colunas.push(
        `<td style="border:1px solid #bbb;padding:6px 10px;font-size:13px;color:#444;min-height:36px;">${item.notas ? escapeHtml(item.notas) : ""}</td>`
      );
      return `<tr>${colunas.join("\n        ")}</tr>`;
    })
    .join("");

  // Cabeçalho dinâmico
  const cabecalhoCols: string[] = [
    `<th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:center;width:40px;">Nº</th>`,
    `<th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:left;">Crianças</th>`,
  ];
  if (mostrarCacifo) {
    cabecalhoCols.push(
      `<th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:center;width:70px;">Cacifo</th>`
    );
  }
  // Coluna de Notas — sempre visível
  cabecalhoCols.push(
    `<th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:left;">Notas</th>`
  );

  const colspan = cabecalhoCols.length;

  const tituloFinal = titulo ?? `Festa de ${anvNomes}`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(tituloFinal)}</title>
  <style>
    * { font-family: 'Inter', Arial, sans-serif; box-sizing: border-box; }
    body { padding: 30px; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    .info { font-size: 13px; color: #666; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    .footer { margin-top: 16px; font-size: 12px; color: #999; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(tituloFinal)}</h1>
  <div class="info">
    Data: ${escapeHtml(data)} · Horário: ${escapeHtml(reserva.horario ?? "—")} · Sala: ${escapeHtml(reserva.local?.nome ?? "—")}
  </div>
  <table>
    <thead>
      <tr>
        ${cabecalhoCols.join("\n        ")}
      </tr>
    </thead>
    <tbody>
      ${linhasHtml || `<tr><td colspan="${colspan}" style="border:1px solid #bbb;padding:20px;text-align:center;color:#999;">Sem crianças registadas</td></tr>`}
    </tbody>
  </table>
  <div class="footer">Total de crianças: ${total} · Gerado em ${new Date().toLocaleString("pt-PT")}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
