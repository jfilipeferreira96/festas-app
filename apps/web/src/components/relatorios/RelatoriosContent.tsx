"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/ui";
import { Search, FileText } from "lucide-react";
import DatePicker from "@/components/form/date-picker";
import { toLocalISODate } from "@/utils/date";
import { useRelatorioFinanceiro } from "@/hooks/use-relatorios";
import RelatorioTabela from "./RelatorioTabela";

export default function RelatoriosContent() {
  const hojeISO = toLocalISODate(new Date());

  const [dataInicio, setDataInicio] = useState<string>(hojeISO);
  const [dataFim, setDataFim] = useState<string>(hojeISO);
  // Inicializa com hoje para carregar automaticamente ao abrir a página
  const [pesquisaInicio, setPesquisaInicio] = useState<string | null>(hojeISO);
  const [pesquisaFim, setPesquisaFim] = useState<string | null>(hojeISO);

  const { data: relatorio, isLoading, isError, error } = useRelatorioFinanceiro(pesquisaInicio, pesquisaFim);

  // Estável (useCallback) — evita re-inicialização do flatpickr a cada render.
  const handleInicioChange = useCallback(([date]: Date[]) => {
    if (!date) return;
    setDataInicio(toLocalISODate(date));
  }, []);

  const handleFimChange = useCallback(([date]: Date[]) => {
    if (!date) return;
    setDataFim(toLocalISODate(date));
  }, []);

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
            <DatePicker
              id="relatorio-data-inicio"
              label="Data Início"
              defaultDate={dataInicio}
              onChange={handleInicioChange}
            />
          </div>
          <div className="flex-1">
            <DatePicker
              id="relatorio-data-fim"
              label="Data Fim"
              defaultDate={dataFim}
              onChange={handleFimChange}
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
