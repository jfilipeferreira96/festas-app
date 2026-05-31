"use client";

import React, { useState } from "react";
import { BarChart2, TrendingUp, Users, Package } from "lucide-react";
import { PageHeader } from "@/components/ui";

export default function RelatoriosContent() {
  const [periodo, setPeriodo] = useState("mensal");

  return (
    <div>
      <PageHeader
        title="Relatórios"
        subtitle="Indicadores e análises de desempenho"
      />

      {/* Period filters */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto no-scrollbar">
          {[
            { value: "mensal", label: "Mensal" },
            { value: "trimestral", label: "Trimestral" },
            { value: "anual", label: "Anual" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriodo(opt.value)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                periodo === opt.value
                  ? "bg-brand-500 text-white shadow-theme-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<BarChart2 size={20} />}
          iconColor="text-primary-500"
          title="Total de Festas"
          value="—"
          subtitle="Dados indisponíveis"
        />
        <KPICard
          icon={<TrendingUp size={20} />}
          iconColor="text-accent-green-500"
          title="Receita Total"
          value="—"
          subtitle="Dados indisponíveis"
        />
        <KPICard
          icon={<Package size={20} />}
          iconColor="text-accent-orange-500"
          title="Taxa de Ocupação"
          value="—"
          subtitle="Dados indisponíveis"
        />
        <KPICard
          icon={<Users size={20} />}
          iconColor="text-accent-purple-500"
          title="Extras Mais Contratados"
          value="—"
          subtitle="Dados indisponíveis"
        />
      </div>

      {/* Charts placeholder */}
      <div className="mt-4 bg-surface rounded-[14px] p-8 shadow-card border border-border text-center">
        <BarChart2 size={48} className="mx-auto text-text-muted mb-3" />
        <p className="text-sm text-text-muted">
          Gráficos e análises detalhadas — em desenvolvimento.
        </p>
        <p className="text-xs text-text-muted mt-1">
          Requer integração com biblioteca de gráficos (ex: Recharts).
        </p>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  iconColor,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
      <div className="flex items-center gap-3 mb-3">
        <div className={`${iconColor}`}>{icon}</div>
        <span className="text-xs font-medium text-text-secondary">{title}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-1">{subtitle}</p>
    </div>
  );
}
