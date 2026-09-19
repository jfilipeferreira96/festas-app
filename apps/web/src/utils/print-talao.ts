import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";

// ── Tipos mínimos para o talão (duck-typing, como print-lista.ts) ──

interface TalaoPagamento {
  valor: number;
  metodo: string;
  nota?: string | null;
}

interface TalaoEntradaInfo {
  id: string;
  inicioEm?: string;
  fimPrevisto?: string;
  duracaoMinutos: number;
  criancas?: Array<{ nome?: string }>;
  encarregadoNome?: string;
  extras?: Array<{ extra?: { nome?: string }; quantidade?: number }> | null;
  meiasQuantidade?: number | null;
  temLanche?: boolean;
  custoTotal: number;
  custoTotalFinal?: number | null;
  pagamentos?: TalaoPagamento[];
}

const ENT_AMP = String.fromCharCode(38) + "amp;";
const ENT_LT = String.fromCharCode(38) + "lt;";
const ENT_GT = String.fromCharCode(38) + "gt;";

function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, ENT_AMP)
    .replace(/</g, ENT_LT)
    .replace(/>/g, ENT_GT);
}

function euro(v: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);
}

function hora(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Talão da entrada livre (pedido do cliente, 19/09/2026) - formato térmico
 * 80mm para impressora USB. O SO do PC encarrega-se de enviar para a
 * impressora configurada (janela de impressão do browser).
 * Inclui: crianças, duração, extras, meias, total e pagamentos recebidos.
 */
export function imprimirTalaoEntrada(entrada: TalaoEntradaInfo): void {
  const total = Number(entrada.custoTotalFinal ?? entrada.custoTotal ?? 0);
  const pagamentos = entrada.pagamentos ?? [];
  const somaPago = pagamentos.reduce((s, p) => s + Number(p.valor ?? 0), 0);
  const falta = Math.max(0, Math.round((total - somaPago) * 100) / 100);
  const agora = new Date().toLocaleString("pt-PT");

  const nomesCriancas = (entrada.criancas ?? [])
    .map((c) => c.nome)
    .filter(Boolean)
    .join(", ");

  const linhasItens: string[] = [];
  linhasItens.push(`Entrada - ${escapeHtml(nomesCriancas || "-")}`);
  linhasItens.push(
    `${hora(entrada.inicioEm)} → ${hora(entrada.fimPrevisto)} (${entrada.duracaoMinutos} min)`
  );
  if (entrada.temLanche) linhasItens.push("Inclui lanche");
  for (const e of entrada.extras ?? []) {
    linhasItens.push(`Extra: ${escapeHtml(e.extra?.nome ?? "-")} ×${e.quantidade ?? 1}`);
  }
  if ((entrada.meiasQuantidade ?? 0) > 0) {
    linhasItens.push(`Meias ×${entrada.meiasQuantidade}`);
  }

  const linhasPagamentos =
    pagamentos.length > 0
      ? pagamentos
          .map(
            (p) =>
              `<div class="linha"><span>${escapeHtml(
                metodoPagamentoLabel(p.metodo)
              )}${p.nota ? ` · ${escapeHtml(p.nota)}` : ""}</span><span>${euro(Number(p.valor))}</span></div>`
          )
          .join("")
      : `<div class="linha"><span>Sem pagamentos</span><span>${euro(0)}</span></div>`;

  const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Talão Entrada Livre</title>
  <style>
    * { box-sizing: border-box; }
    body { width: 80mm; margin: 0; padding: 4mm 3mm; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
    .centro { text-align: center; }
    .titulo { font-size: 15px; font-weight: 700; margin: 2px 0 6px; }
    .sub { font-size: 11px; color: #333; margin-bottom: 8px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .linha { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
    .total { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; margin-top: 4px; }
    .falta { color: #b45309; font-weight: 700; }
    .rodape { font-size: 10px; color: #444; text-align: center; margin-top: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="centro">
    <div class="titulo">ENTRADA LIVRE</div>
    <div class="sub">${escapeHtml(agora)}</div>
  </div>
  <hr>
  ${linhasItens.map((l) => `<div>${l}</div>`).join("")}
  <hr>
  <div class="total"><span>TOTAL</span><span>${euro(total)}</span></div>
  <hr>
  <div class="sub">Pagamentos</div>
  ${linhasPagamentos}
  <div class="linha"><span>Recebido</span><span>${euro(somaPago)}</span></div>
  <div class="linha ${falta > 0 ? "falta" : ""}"><span>${
    falta > 0 ? "FALTA PAGAR" : "LIQUIDADO"
  }</span><span>${falta > 0 ? euro(falta) : "OK"}</span></div>
  <hr>
  <div class="rodape">Encarregado: ${escapeHtml(entrada.encarregadoNome || "-")}<br>Obrigado pela visita!</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=380,height=640");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
