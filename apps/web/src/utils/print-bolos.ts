import { BOLO_LABELS, BOLOS_NOSSOS, ehBoloNosso } from "@/lib/constants/bolo";
import { formatDate } from "@/utils/date";

// ── Tipos mínimos para a impressão (duck-typing, como print-lista.ts) ──

interface ReservaBoloInfo {
  aniversariantes?: Array<{ aniversariante: { nome: string } }>;
  data?: string | Date;
  horario?: string;
  local?: { nome?: string } | null;
  bolo?: string | null;
  boloTema?: string | null;
  numCriancas?: number | null;
  numCriancasConfirmadas?: number | null;
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

/** Chave do dia (YYYY-MM-DD) para agrupamento - tolerante a date-only ou ISO completo. */
function diaChave(r: ReservaBoloInfo): string {
  return r.data ? String(r.data).slice(0, 10) : "";
}

/** Secções por tipo de bolo (ordem BOLOS_NOSSOS) para o conjunto de festas dado. */
function secoesPorTipo(bolos: ReservaBoloInfo[]): string {
  const grupos = BOLOS_NOSSOS.map((tipo) => ({
    tipo,
    label: BOLO_LABELS[tipo] ?? tipo,
    itens: bolos.filter((r) => r.bolo === tipo),
  })).filter((g) => g.itens.length > 0);

  return grupos
    .map((g) => {
      const linhas = g.itens
        .map((r) => {
          const anv = r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "-";
          const pessoas = r.numCriancasConfirmadas ?? r.numCriancas ?? "-";
          return `<tr>
        <td style="border:1px solid #bbb;padding:8px 12px;text-align:center;width:70px;font-weight:600;color:#555;">${escapeHtml(r.horario ?? "-")}</td>
        <td style="border:1px solid #bbb;padding:8px 12px;font-size:15px;">${escapeHtml(anv)}</td>
        <td style="border:1px solid #bbb;padding:8px 12px;font-size:13px;color:#444;">${escapeHtml(r.boloTema ?? "")}</td>
        <td style="border:1px solid #bbb;padding:8px 12px;text-align:center;width:90px;">${escapeHtml(String(pessoas))}</td>
        <td style="border:1px solid #bbb;padding:8px 12px;font-size:13px;color:#666;">${escapeHtml(r.local?.nome ?? "-")}</td>
      </tr>`;
        })
        .join("");

      return `
    <h2 style="font-size:16px;margin:22px 0 8px;">${escapeHtml(g.label)} <span style="font-weight:400;color:#999;">(${g.itens.length})</span></h2>
    <table>
      <thead>
        <tr>
          <th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:center;">Hora</th>
          <th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:left;">Aniversariante(s)</th>
          <th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:left;">Tema</th>
          <th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:center;">Pessoas</th>
          <th style="border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:left;">Sala</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`;
    })
    .join("");
}

/**
 * Imprime a lista de bolos NOSSOS (1kg, 2kg, artístico) das festas dadas,
 * agrupada por tipo - pronta para a cozinha/pastelaria.
 * Quando as festas cobrem vários dias (vista semanal), agrupa primeiro por dia.
 */
export function imprimirBolos(reservas: ReservaBoloInfo[]): void {
  const bolos = reservas.filter((r) => ehBoloNosso(r.bolo));

  // Agrupar por dia (ordenado); um único dia mantém o formato original.
  const dias = Array.from(new Set(bolos.map(diaChave))).sort();
  const variosDias = dias.length > 1;

  let corpo: string;
  if (variosDias) {
    corpo = dias
      .map((dia) => {
        const doDia = bolos.filter((r) => diaChave(r) === dia);
        return `<h2 style="font-size:18px;margin:26px 0 4px;border-bottom:2px solid #ddd;padding-bottom:4px;">${escapeHtml(
          formatDate(dia)
        )} <span style="font-weight:400;color:#999;font-size:14px;">(${doDia.length})</span></h2>${secoesPorTipo(doDia)}`;
      })
      .join("");
  } else {
    corpo = secoesPorTipo(bolos);
  }

  const dataTitulo = bolos[0]?.data ? formatDate(String(bolos[0].data)) : formatDate(new Date().toISOString());
  const tituloDoc = variosDias ? `Bolos - semana de ${escapeHtml(formatDate(dias[0]))} a ${escapeHtml(formatDate(dias[dias.length - 1]))}` : `Bolos - ${escapeHtml(dataTitulo)}`;
  const info = variosDias
    ? `Semana: ${escapeHtml(formatDate(dias[0]))} a ${escapeHtml(formatDate(dias[dias.length - 1]))} · Apenas bolos da casa (1kg, 2kg, artístico)`
    : `Data: ${escapeHtml(dataTitulo)} · Apenas bolos da casa (1kg, 2kg, artístico)`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>${tituloDoc}</title>
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
  <h1>${variosDias ? "Bolos da semana" : "Bolos do dia"}</h1>
  <div class="info">${info}</div>
  ${corpo || `<p style="color:#999;padding:20px;text-align:center;">Sem bolos da casa neste dia</p>`}
  <div class="footer">Total de bolos: ${bolos.length} · Gerado em ${new Date().toLocaleString("pt-PT")}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=600,height=800");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
