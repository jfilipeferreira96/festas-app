"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Search, FileText } from "lucide-react";
import { useRelatorioFinanceiro } from "@/hooks/use-relatorios";
import RelatorioTabela from "./RelatorioTabela";

function toDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function RelatoriosContent() {
  const hoje = new Date();

  const [dataInicio, setDataInicio] = useState<string>(toDateInput(hoje));
  const [dataFim, setDataFim] = useState<string>(toDateInput(hoje));
  // Inicializa com hoje para carregar automaticamente ao abrir a página
  const [pesquisaInicio, setPesquisaInicio] = useState<string | null>(toDateInput(hoje));
  const [pesquisaFim, setPesquisaFim] = useState<string | null>(toDateInput(hoje));

  const { data: relatorio, isLoading, isError, error } = useRelatorioFinanceiro(pesquisaInicio, pesquisaFim);

  const handlePesquisar = useCallback(() => {
    setPesquisaInicio(dataInicio);
    setPesquisaFim(dataFim);
  }, [dataInicio, dataFim]);

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Relatório financeiro e operacional — fecho de caixa"
      />

      {/* Filtros */}
      <div className="mt-4 mb-6 bg-surface rounded-[14px] p-5 shadow-card border border-border">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label htmlFor="data-inicio" className="block text-xs font-medium text-text-secondary mb-1.5">
              Data Início
            </label>
            <input
              id="data-inicio"
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="data-fim" className="block text-xs font-medium text-text-secondary mb-1.5">
              Data Fim
            </label>
            <input
              id="data-fim"
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>
          <button
            onClick={handlePesquisar}
            className="flex items-center justify-center gap-2 h-11 px-6 rounded-lg bg-brand-500 text-white text-sm font-medium shadow-theme-sm hover:bg-brand-600 transition-colors shrink-0"
          >
            <Search size={18} />
            Pesquisar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {!pesquisaInicio && (
        <div className="bg-surface rounded-[14px] p-8 shadow-card border border-border text-center">
          <FileText size={48} className="mx-auto text-text-muted mb-3" />
          <p className="text-sm text-text-muted">
            Selecione um intervalo de datas e clique em Pesquisar para gerar o relatório.
          </p>
        </div>
      )}

      {isLoading && (
        <div className="bg-surface rounded-[14px] p-8 shadow-card border border-border text-center">
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className="h-6 w-48 bg-gray-200 rounded" />
            <div className="h-4 w-64 bg-gray-200 rounded" />
          </div>
        </div>
      )}

      {isError && (
        <div className="bg-surface rounded-[14px] p-8 shadow-card border border-border text-center">
          <p className="text-sm text-error">
            Erro ao carregar relatório: {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
        </div>
      )}

      {relatorio && !isLoading && (
        <RelatorioTabela relatorio={relatorio} />
      )}
    </div>
  );
}