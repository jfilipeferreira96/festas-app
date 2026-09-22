"use client";

import { useFormContext } from "react-hook-form";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import { totalPago, faltaPagar, type PagamentoLedgerItem } from "@/lib/pagamento-ledger";
import { DURACAO_ENTRADA_OPTIONS, type EntradaLivreFormData } from "../entrada-livre-form.schema";

interface CustoComponentes {
  totalPessoas: number;
  criancasComLanche: number;
  custoTempo: number;
  custoLanche: number;
  custoExtras: number;
  total: number;
}

interface PagamentoEntradaSectionProps {
  entrada?: EntradaLivre | null;
  custoComponentes: CustoComponentes;
  custoCalculado: number;
  precoMeias: number;
  onOpenPagamento: () => void;
}

export default function PagamentoEntradaSection({
  entrada,
  custoComponentes,
  custoCalculado,
  precoMeias,
  onOpenPagamento,
}: PagamentoEntradaSectionProps) {
  const isEdit = !!entrada;
  const { setValue, watch } = useFormContext<EntradaLivreFormData>();

  const duracao = watch("duracaoMinutos");
  const meias = watch("meiasQuantidade") ?? 0;
  const duracaoLabel = DURACAO_ENTRADA_OPTIONS.find((o) => o.value === String(duracao))?.label ?? `${duracao}min`;

  const pagamentosForm = (watch("pagamentos") ?? []) as PagamentoLedgerItem[];

  // Resumo em edição: estado do acerto visível sem abrir "Gerir pagamento".
  const pagamentosEntrada: PagamentoLedgerItem[] = (entrada?.pagamentos ?? []).map((p) => ({
    id: p.id,
    valor: Number(p.valor),
    metodo: p.metodo as PagamentoLedgerItem["metodo"],
    nota: p.nota ?? null,
    createdAt: p.createdAt,
  }));
  const devido = Number(entrada?.custoTotalFinal ?? entrada?.custoTotal ?? 0);
  const recebido = totalPago(pagamentosEntrada);
  const falta = faltaPagar(devido, pagamentosEntrada);

  return (
    <PagamentoCard acao={isEdit && entrada ? <BotaoGerirPagamento onClick={onOpenPagamento} /> : undefined}>
      {isEdit && entrada ? (
        <PagamentoResumo
          items={[
            { label: "Estado", value: entrada.pago ? "Pago" : "Por pagar", tone: entrada.pago ? "verde" : "laranja" },
            {
              label: "Valor total",
              value: formatEuro(devido),
            },
            { label: "Valor pago", value: formatEuro(recebido) },
            ...(falta > 0 ? [{ label: "Falta", value: formatEuro(falta), tone: "laranja" as const }] : []),
            {
              label: "Método",
              value:
                pagamentosEntrada.length > 0
                  ? pagamentosEntrada.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
                  : "Não definido",
            },
            { label: "Meias", value: `${meias} ${meias === 1 ? "par" : "pares"}` },
          ]}
        />
      ) : (
        <div className="space-y-3">
          {/* Total sempre calculado (tarifário + extras), igual ao form de Festas:
              não existe input livre - correcções formais ficam no "Gerir pagamento"
              (ajustes) após criar a entrada. O custoTotal segue hidden no payload. */}

          {/* Ledger de pagamentos: adicionar (método obrigatório) até completar; pago derivado */}
          <PagamentosLedgerSection
            totalDevido={custoCalculado}
            pagamentos={pagamentosForm}
            onAdd={(p) =>
              setValue(
                "pagamentos",
                [
                  ...pagamentosForm,
                  { ...p, id: `pg-${Date.now()}-${pagamentosForm.length}`, createdAt: new Date().toISOString() },
                ] as PagamentoLedgerItem[],
                { shouldDirty: true },
              )
            }
            onRemove={(id) =>
              setValue("pagamentos", pagamentosForm.filter((x) => x.id !== id) as PagamentoLedgerItem[], {
                shouldDirty: true,
              })
            }
          />
        </div>
      )}

      {/* Bloco Meias movido para DuracaoLancheSection (antes do pagamento),
          a pedido do cliente (19/09/2026). */}

      {!isEdit && (
        <BreakdownEntrada
          custoComponentes={custoComponentes}
          custoFinal={custoCalculado}
          precoMeias={precoMeias}
          meias={meias}
          duracaoLabel={duracaoLabel}
          comTitulo
        />
      )}
    </PagamentoCard>
  );
}

interface BreakdownProps {
  custoComponentes: CustoComponentes;
  custoFinal: number;
  precoMeias: number;
  meias: number;
  duracaoLabel: string;
  comTitulo?: boolean;
}

function BreakdownEntrada({ custoComponentes, custoFinal, precoMeias, meias, duracaoLabel, comTitulo }: BreakdownProps) {
  return (
    <div className={`space-y-1.5 ${comTitulo ? "border-t border-border pt-3" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          Tempo ({duracaoLabel} × {custoComponentes.totalPessoas}p)
        </span>
        <span className="text-xs text-text-secondary">{formatEuro(custoComponentes.custoTempo)}</span>
      </div>
      {custoComponentes.custoLanche > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Lanche ({custoComponentes.criancasComLanche} {custoComponentes.criancasComLanche === 1 ? "criança" : "crianças"})
          </span>
          <span className="text-xs text-text-secondary">{formatEuro(custoComponentes.custoLanche)}</span>
        </div>
      )}
      {meias > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Meias ({meias} {meias === 1 ? "par" : "pares"})
          </span>
          <span className="text-xs text-text-secondary">{formatEuro(meias * precoMeias)}</span>
        </div>
      )}
      {custoComponentes.custoExtras > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">Extras</span>
          <span className="text-xs text-text-secondary">{formatEuro(custoComponentes.custoExtras)}</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
        <span className="text-sm font-semibold text-text-primary">Total</span>
        <span className="text-base font-bold text-primary-500">{formatEuro(custoFinal)}</span>
      </div>
    </div>
  );
}
