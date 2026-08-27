"use client";

import { useMemo } from "react";
import type { RelatorioFinanceiro, SecaoRelatorio, LinhaRelatorio } from "@/lib/api/relatorios";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const currencyFmt = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

function fmtMoeda(v: number): string {
  if (v === 0) return "—";
  return currencyFmt.format(v);
}

// ── Componentes internos ───────────────────────────────────────

function CabecalhoTabela() {
  return (
    <thead className="bg-gray-50/50 border-b border-border">
      <tr>
        <th className="px-3 py-2.5 text-left text-xs font-semibold text-text-secondary">DESCRIÇÃO</th>
        <th className="px-3 py-2.5 text-center text-xs font-semibold text-text-secondary">QUANT.</th>
        <th className="px-3 py-2.5 text-center text-xs font-semibold text-text-secondary">CRIANÇAS</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">NUMERÁRIO</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">MULTIBANCO</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">TRANSFERÊNCIA</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">MBWAY</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">CARTÃO</th>
        <th className="px-3 py-2.5 text-right text-xs font-semibold text-text-secondary">OUTRO</th>
      </tr>
    </thead>
  );
}

function LinhaDados({ linha }: { linha: LinhaRelatorio }) {
  return (
    <tr className="border-b border-border/50 hover:bg-gray-50/30 transition-colors">
      <td className="px-3 py-2 text-sm text-text-primary">{linha.descricao}</td>
      <td className="px-3 py-2 text-center text-sm text-text-secondary">{linha.quantidade || "—"}</td>
      <td className="px-3 py-2 text-center text-sm text-text-secondary">{linha.totalCriancas || "—"}</td>
      <td className="px-3 py-2 text-right text-sm text-text-primary tabular-nums">{fmtMoeda(linha.valorNumerario)}</td>
      <td className="px-3 py-2 text-right text-sm text-text-primary tabular-nums">{fmtMoeda(linha.valorMultibanco)}</td>
      <td className="px-3 py-2 text-right text-sm text-text-primary tabular-nums">{fmtMoeda(linha.valorTransferencia)}</td>
      <td className="px-3 py-2 text-right text-sm text-text-primary tabular-nums">{fmtMoeda(linha.valorMbway)}</td>
      <td className="px-3 py-2 text-right text-sm text-text-primary tabular-nums">{fmtMoeda(linha.valorCartao)}</td>
      <td className="px-3 py-2 text-right text-sm text-text-primary tabular-nums">{fmtMoeda(linha.valorOutro)}</td>
    </tr>
  );
}

function LinhaTotal({ linha }: { linha: LinhaRelatorio }) {
  return (
    <tr className="bg-brand-50/40 border-y border-brand-200/50 font-semibold">
      <td className="px-3 py-2.5 text-sm text-brand-700">{linha.descricao}</td>
      <td className="px-3 py-2.5 text-center text-sm text-brand-700">{linha.quantidade || "—"}</td>
      <td className="px-3 py-2.5 text-center text-sm text-brand-700">{linha.totalCriancas || "—"}</td>
      <td className="px-3 py-2.5 text-right text-sm text-brand-700 tabular-nums">{fmtMoeda(linha.valorNumerario)}</td>
      <td className="px-3 py-2.5 text-right text-sm text-brand-700 tabular-nums">{fmtMoeda(linha.valorMultibanco)}</td>
      <td className="px-3 py-2.5 text-right text-sm text-brand-700 tabular-nums">{fmtMoeda(linha.valorTransferencia)}</td>
      <td className="px-3 py-2.5 text-right text-sm text-brand-700 tabular-nums">{fmtMoeda(linha.valorMbway)}</td>
      <td className="px-3 py-2.5 text-right text-sm text-brand-700 tabular-nums">{fmtMoeda(linha.valorCartao)}</td>
      <td className="px-3 py-2.5 text-right text-sm text-brand-700 tabular-nums">{fmtMoeda(linha.valorOutro)}</td>
    </tr>
  );
}

function SecaoTabela({ secao }: { secao: SecaoRelatorio }) {
  // Não renderizar secções sem dados reais
  if (secao.linhas.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-text-primary mb-2 px-1">{secao.titulo}</h3>
      <div className="overflow-x-auto rounded-[14px] border border-border bg-surface shadow-card">
        <table className="w-full">
          <CabecalhoTabela />
          <tbody>
            {secao.linhas.map((linha, i) => (
              <LinhaDados key={`${secao.titulo}-${i}`} linha={linha} />
            ))}
            <LinhaTotal linha={secao.total} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────

export default function RelatorioTabela({ relatorio }: { relatorio: RelatorioFinanceiro }) {
  const periodo = useMemo(() => {
    try {
      const ini = format(new Date(relatorio.dataInicio), "dd 'de' MMMM 'de' yyyy", { locale: pt });
      const fim = format(new Date(relatorio.dataFim), "dd 'de' MMMM 'de' yyyy", { locale: pt });
      return `${ini} — ${fim}`;
    } catch {
      return "Período selecionado";
    }
  }, [relatorio.dataInicio, relatorio.dataFim]);

  return (
    <div>
      <p className="text-xs text-text-muted mb-4">
        Período: <span className="font-medium text-text-secondary">{periodo}</span>
      </p>

      <SecaoTabela secao={relatorio.festas} />
      <SecaoTabela secao={relatorio.entradasLivres} />
      <SecaoTabela secao={relatorio.outros} />

      {/* Ajustes de pagamento — auditoria (não soma ao Total Geral) */}
      {relatorio.ajustes && relatorio.ajustes.linhas.length > 0 && (
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-2 px-1">
            <h3 className="text-sm font-semibold text-text-primary">{relatorio.ajustes.titulo}</h3>
            <span className="text-[11px] text-text-muted">
              Valores já incluídos nos totais acima — listagem para auditoria
            </span>
          </div>
          <div className="overflow-x-auto rounded-[14px] border border-dashed border-border bg-surface/60 shadow-card">
            <table className="w-full">
              <CabecalhoTabela />
              <tbody>
                {relatorio.ajustes.linhas.map((linha, i) => (
                  <LinhaDados key={`ajustes-${i}`} linha={linha} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Total Geral */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-2 px-1">Total Geral</h3>
        <div className="overflow-x-auto rounded-[14px] border-2 border-brand-300 bg-surface shadow-card">
          <table className="w-full">
            <CabecalhoTabela />
            <tbody>
              <LinhaTotal linha={relatorio.totalGeral} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}