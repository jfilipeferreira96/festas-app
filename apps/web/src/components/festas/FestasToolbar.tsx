"use client";

import React from "react";
import { Printer, Plus } from "lucide-react";

export type FestaTab =
  | "hoje"
  | "amanha"
  | "semana"
  | "em_curso"
  | "todos"
  | "concluidos"
  | "RESERVA"
  | "CONFIRMADO"
  | "data";

interface TabOption {
  value: FestaTab;
  label: string;
  countKey?: "RESERVA" | "CONFIRMADO" | "EM_CURSO" | "CONCLUIDA";
}

const TAB_OPTIONS: TabOption[] = [
  { value: "hoje", label: "Hoje" },
  { value: "amanha", label: "Amanhã" },
  { value: "semana", label: "Esta Semana" },
  { value: "em_curso", label: "Em Curso", countKey: "EM_CURSO" },
  { value: "todos", label: "Todas" },
  { value: "concluidos", label: "Concluídas", countKey: "CONCLUIDA" },
  { value: "RESERVA", label: "Pendentes", countKey: "RESERVA" },
  { value: "CONFIRMADO", label: "Confirmadas", countKey: "CONFIRMADO" },
];

interface FestasToolbarProps {
  tab: FestaTab;
  onTabChange: (tab: FestaTab) => void;
  counts: Record<string, number>;
  onPrint: () => void;
  /** Callback para criar nova festa (botão à direita). Se omitido, não mostra o botão. */
  onCreate?: () => void;
}

/** Barra de tabs + acções (Nova Festa + Imprimir). DatePicker é renderizada separadamente. */
const FestasToolbar: React.FC<FestasToolbarProps> = React.memo(
  ({ tab, onTabChange, counts, onPrint, onCreate }) => {
    return (
      <div className="flex items-center justify-between gap-4 mt-4 mb-6 flex-wrap no-print">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto filter-scrollbar max-w-full">
            {TAB_OPTIONS.map((opt) => {
              const isActive = tab === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onTabChange(opt.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-brand-500 text-white shadow-theme-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                  {opt.countKey && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-gray-100 text-text-muted"
                      }`}
                    >
                      {counts[opt.countKey] ?? 0}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-theme-xs"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>

          {onCreate && (
            <button
              onClick={onCreate}
              className="inline-flex items-center justify-center font-medium gap-2 rounded-[10px] transition-all duration-200 flex items-center gap-2 px-5 py-2.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600"
            >
              <Plus size={16} />
              Nova Festa
            </button>
          )}
        </div>
      </div>
    );
  },
);

FestasToolbar.displayName = "FestasToolbar";
export default FestasToolbar;
