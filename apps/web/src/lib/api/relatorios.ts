import { api } from "./utils";
import type { RelatorioFinanceiro } from "@saas/shared-types";

// Re-export types for components
export type { LinhaRelatorio, SecaoRelatorio, RelatorioFinanceiro } from "@saas/shared-types";

// ── API calls ──────────────────────────────────────────────────

export const relatoriosApi = {
  getRelatorioFinanceiro: (dataInicio: string, dataFim: string) =>
    api<RelatorioFinanceiro>(
      `/api/relatorios/financeiro?dataInicio=${encodeURIComponent(dataInicio)}&dataFim=${encodeURIComponent(dataFim)}`,
    ),
};