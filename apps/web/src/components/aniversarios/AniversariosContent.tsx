"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { Cake, Phone, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { Select } from "@/components/ui/select";
import { useAniversariosProximos } from "@/hooks/use-dashboard";
import type { AniversarioProximo } from "@/lib/api/dashboard";

/** Linha com id (DataTable exige id). */
type AniversarioRow = AniversarioProximo & { id: string };

/** Tabela de aniversários próximos - para incorporar dentro da página de Clientes (sub-tab). */
export function AniversariosTabela() {
  const [dias, setDias] = useState(30);
  const [pesquisa, setPesquisa] = useState("");
  const { data: aniversarios, isLoading } = useAniversariosProximos(dias);

  const filtrados = useMemo<AniversarioRow[]>(() => {
    const base = (aniversarios ?? []).map((a) => ({ ...a, id: a.aniversariante.id }));
    if (!pesquisa.trim()) return base;
    const q = pesquisa.toLowerCase();
    return base.filter(
      (a) =>
        a.aniversariante.nome.toLowerCase().includes(q) ||
        a.cliente.nome.toLowerCase().includes(q) ||
        a.cliente.telefone?.toLowerCase().includes(q)
    );
  }, [aniversarios, pesquisa]);

  const semReservaCount = filtrados.filter((a) => !a.temReservaNoMes).length;

  const columns: Column<AniversarioRow>[] = [
    {
      key: "aniversariante",
      label: "Criança",
      sortable: true,
      render: (_v, item) => (
        <div className="flex items-center gap-2">
          <Cake size={14} className="text-brand-500 shrink-0" />
          <span className="text-sm font-medium text-text-primary">{item.aniversariante.nome}</span>
        </div>
      ),
    },
    {
      key: "idadeQueFaz",
      label: "Idade",
      sortable: true,
      render: (v) => (
        <span className="text-sm text-text-secondary">{v != null ? `${v} anos` : "-"}</span>
      ),
    },
    {
      key: "proximoAniversario",
      label: "Aniversário",
      sortable: true,
      render: (v) => (
        <span className="text-sm text-text-secondary whitespace-nowrap capitalize">
          {format(new Date(v as string), "dd 'de' MMMM", { locale: pt })}
        </span>
      ),
    },
    {
      key: "cliente",
      label: "Cliente",
      sortable: true,
      render: (_v, item) => <span className="text-sm text-text-secondary">{item.cliente.nome}</span>,
    },
    {
      key: "contacto",
      label: "Contacto",
      render: (_v, item) => (
        <div className="flex items-center gap-1.5">
          <Phone size={13} className="text-text-muted" />
          <span className="text-sm text-text-secondary">{item.cliente.telefone || "-"}</span>
        </div>
      ),
    },
    {
      key: "temReservaNoMes",
      label: "Estado",
      render: (_v, item) =>
        item.temReservaNoMes ? (
          <span className="inline-block text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full">
            Reservado
          </span>
        ) : (
          <span className="inline-block text-[11px] font-medium text-accent-orange-700 bg-accent-orange-50 px-2 py-0.5 rounded-full">
            Sem reserva
          </span>
        ),
    },
    {
      key: "accoes",
      label: "Acção",
      render: (_v, item) =>
        !item.temReservaNoMes ? (
          <Link
            href={`/reservas?cliente=${item.cliente.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
          >
            <Plus size={13} />
            Criar reserva
          </Link>
        ) : (
          <span className="text-xs text-text-muted">-</span>
        ),
    },
  ];

  const periodoOptions = [
    { value: "7", label: "7 dias" },
    { value: "15", label: "15 dias" },
    { value: "30", label: "30 dias" },
    { value: "60", label: "60 dias" },
    { value: "90", label: "90 dias" },
  ];

  return (
    <div>
      {/* Barra de filtros */}
      <div className="p-4 rounded-xl bg-white border border-border shadow-theme-xs mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Período - Select do projeto */}
            <div className="w-44">
              <Select
                options={periodoOptions}
                value={String(dias)}
                onChange={(v) => setDias(Number(v))}
                placeholder="Período"
              />
            </div>

            {/* Pesquisa */}
            <div className="relative w-64 max-w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={pesquisa}
                onChange={(e) => setPesquisa(e.target.value)}
                placeholder="Pesquisar criança / cliente..."
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-9 pr-3 text-sm text-gray-800 placeholder:text-gray-400 shadow-theme-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300"
              />
            </div>
          </div>

          {/* Contadores */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-sm font-medium text-text-secondary">
              <Cake size={14} />
              {filtrados.length} aniversário(s)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-orange-50 text-sm font-medium text-accent-orange-700">
              {semReservaCount} sem reserva
            </span>
          </div>
        </div>
      </div>

      <DataTable<AniversarioRow>
        data={filtrados}
        columns={columns}
        loading={isLoading}
        pagination
        pageSize={25}
        itemLabel="aniversários"
        emptyState={{
          title: "Sem aniversários",
          description: "Não há aniversários registados no período seleccionado.",
        }}
      />
    </div>
  );
}

export default AniversariosTabela;
