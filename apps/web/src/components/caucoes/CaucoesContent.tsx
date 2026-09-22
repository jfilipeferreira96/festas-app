"use client";

import React, { useMemo, useState } from "react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import LoadingState from "@/components/ui/LoadingState";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { useCaucoes } from "@/hooks/use-caucoes";
import type { CaucaoItem } from "@/lib/api/caucoes";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";

const fmtEuro = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

const CAUCAO_LABELS: Record<string, string> = {
  PAGA: "Paga",
  PAGA_NO_DIA: "Paga no dia",
  NAO_PAGA: "Por pagar",
};

const FILTER_OPTIONS = [
  { value: "NAO_PAGA", label: "Por pagar" },
  { value: "PAGA", label: "Pagas" },
  { value: "", label: "Todas" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function CaucoesContent() {
  // Tab inicial: Por pagar (pedido do cliente, 22/09/2026)
  const [filtro, setFiltro] = useState("NAO_PAGA");
  const { data: caucoes, isLoading } = useCaucoes(
    filtro ? { estadoCaucao: filtro } : undefined
  );

  // Não pagas PRIMEIRO (21/09/2026)
  const caucoesOrdenadas = useMemo(() => {
    const lista = [...(caucoes ?? [])];
    lista.sort((a, b) => {
      const pesoA = a.caucao === "PAGA" ? 1 : 0;
      const pesoB = b.caucao === "PAGA" ? 1 : 0;
      return pesoA - pesoB;
    });
    return lista;
  }, [caucoes]);

  // 3 cartões com semântica clara: pagas (PAGA) vs por pagar (restantes,
  // incluindo "paga no dia" que ainda não foi cobrada).
  const totais = useMemo(() => {
    const lista = caucoes ?? [];
    const pagas = lista.filter((c) => c.caucao === "PAGA");
    const porPagar = lista.filter((c) => c.caucao !== "PAGA");
    const valorTotal = lista.reduce((s, c) => s + (c.valorCaucao ?? 0), 0);
    return {
      total: lista.length,
      valorTotal,
      valorPagas: pagas.reduce((s, c) => s + (c.valorCaucao ?? 0), 0),
      valorPorPagar: porPagar.reduce((s, c) => s + (c.valorCaucao ?? 0), 0),
    };
  }, [caucoes]);

  const columns: Column<CaucaoItem>[] = useMemo(
    () => [
      {
        key: "cliente",
        label: "Cliente",
        render: (_v, r) => (
          <div>
            <p className="text-sm font-medium text-text-primary">{r.cliente?.nome ?? "-"}</p>
            <p className="text-xs text-text-muted">{r.cliente?.telefone ?? ""}</p>
          </div>
        ),
      },
      {
        key: "festa",
        label: "Aniversariante",
        render: (_v, r) => (
          <span className="text-sm text-text-primary">
            {r.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "-"}
          </span>
        ),
      },
      {
        key: "data",
        label: "Data",
        sortable: true,
        render: (_v, r) => (
          <div>
            <p className="text-sm text-text-primary whitespace-nowrap">
              {formatDate(r.data)} · {r.horario}
            </p>
            <p className="text-xs text-text-muted">{r.salaLanche?.nome ?? "-"}</p>
          </div>
        ),
      },
      {
        key: "valorCaucao",
        label: "Valor",
        sortable: true,
        render: (_v, r) => (
          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
            {r.valorCaucao != null ? fmtEuro(r.valorCaucao) : "-"}
          </span>
        ),
      },
      {
        key: "caucao",
        label: "Estado",
        sortable: true,
        render: (_v, r) => {
          const paga = r.caucao === "PAGA";
          const pagaNoDia = r.caucao === "PAGA_NO_DIA";
          const cls = paga
            ? "bg-accent-green-50 text-accent-green-600 border-accent-green-200"
            : pagaNoDia
              ? "bg-accent-orange-50 text-accent-orange-600 border-accent-orange-200"
              : "bg-gray-50 text-text-muted border-gray-200";
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border whitespace-nowrap ${cls}`}>
              {CAUCAO_LABELS[r.caucao] ?? r.caucao}
            </span>
          );
        },
      },
      {
        key: "metodoCaucao",
        label: "Método",
        render: (_v, r) => (
          <span className="text-xs text-text-secondary">
            {r.metodoCaucao ? metodoPagamentoLabel(r.metodoCaucao) : "-"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Cauções"
        subtitle="Controlo de cauções - pagas e por pagar"
      />

      {/* Totais: 3 cartões - pagas vs por pagar (inclui "paga no dia", que
          ainda não foi cobrada) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div className="rounded-xl border border-border bg-surface shadow-card p-4">
          <p className="text-xs text-text-muted">Total de cauções</p>
          <p className="text-xl font-bold text-text-primary font-poppins">{totais.total}</p>
          <p className="text-xs text-text-muted mt-0.5">{fmtEuro(totais.valorTotal)} em cauções</p>
        </div>
        <div className="rounded-xl border border-accent-green-200 bg-accent-green-50 shadow-card p-4">
          <p className="text-xs text-accent-green-700">Pagas</p>
          <p className="text-xl font-bold text-accent-green-700 font-poppins">{fmtEuro(totais.valorPagas)}</p>
        </div>
        <div className="rounded-xl border border-accent-orange-200 bg-accent-orange-50 shadow-card p-4">
          <p className="text-xs text-accent-orange-700">Por pagar</p>
          <p className="text-xl font-bold text-accent-orange-700 font-poppins">{fmtEuro(totais.valorPorPagar)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mt-6 mb-4 flex-wrap">
        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFiltro(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                filtro === opt.value
                  ? "bg-brand-500 text-white shadow-theme-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-surface rounded-[14px] shadow-card border border-border">
          <LoadingState className="h-64" message="A carregar cauções..." />
        </div>
      ) : (
        <DataTable<CaucaoItem>
          data={caucoesOrdenadas}
          itemLabel="cauções"
          defaultSort={{ key: "data", direction: "desc" }}
          columns={columns}
          searchable
          searchPlaceholder="Pesquisar por cliente, telefone..."
          searchFn={(r, q) =>
            (r.cliente?.nome?.toLowerCase().includes(q) ?? false) ||
            (r.cliente?.telefone?.includes(q) ?? false) ||
            (r.aniversariantes?.some((a) => a.aniversariante.nome.toLowerCase().includes(q)) ?? false)
          }
          pagination
          pageSize={25}
          emptyState={{
            title: "Sem cauções",
            description: "Não há cauções para o filtro selecionado.",
          }}
        />
      )}
    </div>
  );
}
