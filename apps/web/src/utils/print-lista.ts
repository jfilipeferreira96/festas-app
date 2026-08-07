import { formatDate } from "@/utils/date";

// ── Tipos mínimos para a impressão ────────────────────────────────
// Usamos tipos estruturais (duck-typing) para que a função aceite
// tanto a Reserva da API como qualquer objecto com os mesmos campos.

interface ReservaPrintInfo {
  aniversariantes?: Array<{ aniversariante: { nome: string } }>;
  data?: string | Date;
  horario?: string;
  local?: { nome?: string } | null;
}

interface CacifoPrintInfo {
  numero: number;
  criancas?: string | null;
}

/**
 * Extrai todos os nomes de crianças a partir dos cacifos e aniversariantes.
 * Os cacifos guardam os nomes separados por vírgula ou nova-linha.
 */
function extrairNomesCriancas(
  reserva: ReservaPrintInfo,
  cacifos: CacifoPrintInfo[]
): string[] {
  const nomes: string[] = [];

  // 1. Nomes dos cacifos (crianças presentes na festa)
  for (const cacifo of cacifos) {
    if (!cacifo.criancas || cacifo.criancas === "Por preencher") continue;
    const separados = cacifo.criancas
      .split(/[,;\n]/)
      .map((n) => n.trim())
      .filter(Boolean);
    nomes.push(...separados);
  }

  // 2. Se não há cacifos preenchidos, usar os aniversariantes
  if (nomes.length === 0 && reserva.aniversariantes) {
    for (const a of reserva.aniversariantes) {
      if (a.aniversariante.nome?.trim()) nomes.push(a.aniversariante.nome.trim());
    }
  }

  // Deduplicar mantendo a ordem
  return [...new Set(nomes)];
}

// ── Impressão Lista de Crianças ──────────────────────────────────
/**
 * Abre uma nova janela com uma lista simples e limpa dos nomes das
 * crianças da festa, pronta a imprimir.
 */
export function imprimirListaConvidados(
  reserva: ReservaPrintInfo,
  cacifos: CacifoPrintInfo[]
): void {
  const nomes = extrairNomesCriancas(reserva, cacifos);
  const anvNomes =
    reserva.aniversariantes
      ?.map((a) => a.aniversariante.nome)
      .join(", ") || "—";
  const data = formatDate(reserva.data ? String(reserva.data) : "");
  const total = nomes.length;

  const linhasHtml = nomes
    .map(
      (nome, i) =>
        `<tr>
        <td style="border:1px solid #bbb;padding:8px 12px;font-weight:600;width:40px;text-align:center;color:#555;">${i + 1}</td>
        <td style="border:1px solid #bbb;padding:8px 12px;font-size:15px;">${nome}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Lista de Crianças — ${anvNomes}</title>
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
  <h1>🎉 Festa de ${anvNomes}</h1>
  <div class="info">
    Data: ${data} · Horário: ${reserva.horario ?? "—"} · Sala: ${reserva.local?.nome ?? "—"}
  </div>
  <table>
    <tbody>
      ${linhasHtml || '<tr><td colspan="2" style="border:1px solid #bbb;padding:20px;text-align:center;color:#999;">Sem crianças registadas</td></tr>'}
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
