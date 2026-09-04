import type { Extra } from "@/lib/api/extras";

export function quantidadeDeExtra(quantidades: Record<string, number> | undefined, extraId: string) {
  const q = quantidades?.[extraId];
  return Math.max(1, Math.round(q ?? 1));
}

export interface ExtraQuantificado {
  extraId: string;
  quantidade: number;
}

export function calcularCustoExtras(
  itens: ExtraQuantificado[],
  extras: Pick<Extra, "id" | "precoUnitario" | "baseCobranca">[],
  numPessoas: number
): number {
  const porId = new Map(extras.map((e) => [e.id, e]));
  return itens.reduce((acc, item) => {
    const ex = porId.get(item.extraId);
    if (!ex) return acc;
    const qtd = ex.baseCobranca === "POR_PESSOA" ? numPessoas : item.quantidade;
    return acc + Number(ex.precoUnitario) * qtd;
  }, 0);
}
