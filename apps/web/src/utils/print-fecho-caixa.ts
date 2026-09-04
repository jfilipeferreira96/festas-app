import type { FechoCaixa } from "@/lib/api/fecho-caixa";

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

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const METODO_LABELS: Record<string, string> = {
  DINHEIRO: "Dinheiro (numerário)",
  MULTIBANCO: "Multibanco",
  TRANSFERENCIA: "Transferência",
  MBWAY: "MB WAY",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const AJUSTE_LABELS: Record<string, string> = {
  ACRESCIMO: "Acréscimo",
  DESCONTO: "Desconto",
  REDEFINICAO: "Redefinição de preço",
};

/**
 * Abre uma janela com o resumo do fecho de caixa do dia, pronto a imprimir:
 * totais por método, numerário vs eletrónico e ajustes de auditoria.
 */
export function imprimirFechoCaixa(fecho: FechoCaixa): void {
  const dataFmt = new Date(`${fecho.data}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const metodosHtml = Object.entries(fecho.porMetodo)
    .filter(([, valor]) => valor > 0)
    .map(
      ([metodo, valor]) =>
        `<tr><td style="border:1px solid #bbb;padding:8px 12px;">${escapeHtml(METODO_LABELS[metodo] ?? metodo)}</td>` +
        `<td style="border:1px solid #bbb;padding:8px 12px;text-align:right;font-weight:600;">${fmtEuro.format(valor)}</td></tr>`
    )
    .join("");

  const ajustesHtml = fecho.ajustes
    .map(
      (a) =>
        `<tr><td style="border:1px solid #bbb;padding:6px 10px;font-size:12px;color:#666;white-space:nowrap;">${escapeHtml(
          new Date(a.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
        )}</td>` +
        `<td style="border:1px solid #bbb;padding:6px 10px;font-size:13px;">${escapeHtml(AJUSTE_LABELS[a.tipo] ?? a.tipo)}${
          a.tipo === "REDEFINICAO" && a.precoPorCabeca != null
            ? ` <span style="color:#888;">(${fmtEuro.format(a.precoPorCabeca)}/criança)</span>`
            : ""
        }${a.reservaId ? ` <span style="color:#888;">· festa</span>` : ""}${a.entradaLivreId ? ` <span style="color:#888;">· entrada livre</span>` : ""}</td>` +
        `<td style="border:1px solid #bbb;padding:6px 10px;font-size:12px;color:#444;">${escapeHtml(a.motivo)}</td>` +
        `<td style="border:1px solid #bbb;padding:6px 10px;text-align:right;font-size:13px;font-weight:600;">${
          a.tipo === "ACRESCIMO" ? "+" : a.tipo === "DESCONTO" ? "−" : "→"
        } ${fmtEuro.format(a.valor)}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Fecho de Caixa - ${escapeHtml(fecho.data)}</title>
  <style>
    * { font-family: 'Inter', Arial, sans-serif; box-sizing: border-box; }
    body { padding: 30px; color: #1a1a1a; }
    h1 { font-size: 20px; margin-bottom: 2px; }
    h2 { font-size: 15px; margin: 18px 0 8px; color: #333; }
    .info { font-size: 13px; color: #666; margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; }
    th { border:1px solid #bbb;padding:8px 12px;background:#f5f5f5;font-size:12px;font-weight:600;color:#666;text-align:left; }
    .destaque td { font-size: 15px; font-weight: 700; background: #f9f9f9; }
    .footer { margin-top: 16px; font-size: 12px; color: #999; }
    @media print { body { padding: 15px; } }
  </style>
</head>
<body>
  <h1>Fecho de Caixa</h1>
  <div class="info">${escapeHtml(dataFmt)}</div>

  <h2>Resumo por método</h2>
  <table>
    <thead><tr><th>Método</th><th style="text-align:right;">Valor</th></tr></thead>
    <tbody>
      ${metodosHtml || `<tr><td colspan="2" style="border:1px solid #bbb;padding:20px;text-align:center;color:#999;">Sem recebimentos neste dia</td></tr>`}
      <tr class="destaque"><td style="border:1px solid #bbb;padding:8px 12px;">Numerário</td><td style="border:1px solid #bbb;padding:8px 12px;text-align:right;">${fmtEuro.format(fecho.numerario)}</td></tr>
      <tr class="destaque"><td style="border:1px solid #bbb;padding:8px 12px;">Eletrónico</td><td style="border:1px solid #bbb;padding:8px 12px;text-align:right;">${fmtEuro.format(fecho.eletronico)}</td></tr>
      <tr class="destaque"><td style="border:1px solid #bbb;padding:8px 12px;">TOTAL</td><td style="border:1px solid #bbb;padding:8px 12px;text-align:right;">${fmtEuro.format(fecho.total)}</td></tr>
    </tbody>
  </table>

  <h2>Detalhe</h2>
  <table>
    <thead><tr><th>Origem</th><th style="text-align:right;">Valor</th></tr></thead>
    <tbody>
      <tr><td style="border:1px solid #bbb;padding:8px 12px;">Festas</td><td style="border:1px solid #bbb;padding:8px 12px;text-align:right;">${fmtEuro.format(fecho.detalhe.festas)}</td></tr>
      <tr><td style="border:1px solid #bbb;padding:8px 12px;">Entradas livres</td><td style="border:1px solid #bbb;padding:8px 12px;text-align:right;">${fmtEuro.format(fecho.detalhe.entradasLivres)}</td></tr>
      <tr><td style="border:1px solid #bbb;padding:8px 12px;">Outros (cauções, excesso, meias)</td><td style="border:1px solid #bbb;padding:8px 12px;text-align:right;">${fmtEuro.format(fecho.detalhe.outros)}</td></tr>
    </tbody>
  </table>

  ${
    fecho.ajustes.length > 0
      ? `<h2>Ajustes do dia (auditoria)</h2>
  <table>
    <thead><tr><th>Hora</th><th>Tipo</th><th>Nota</th><th style="text-align:right;">Valor</th></tr></thead>
    <tbody>${ajustesHtml}</tbody>
  </table>`
      : ""
  }

  <div class="footer">Gerado em ${new Date().toLocaleString("pt-PT")}</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=700,height=900");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
