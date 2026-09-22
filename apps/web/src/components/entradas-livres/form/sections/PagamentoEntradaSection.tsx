"use client";

import { useFormContext } from "react-hook-form";
import { ArrowUpDown, CreditCard } from "lucide-react";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import InlineTabs from "@/components/shared/pagamento/InlineTabs";
import AjustesPagamentoSection from "@/components/shared/AjustesPagamentoSection";
import { EPS, faltaPagar, totalPago, type PagamentoLedgerItem } from "@/lib/pagamento-ledger";
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

  // Total vivo: o EntradaLivreForm preenche custoTotal quando a composição
  // muda (efeito de recálculo) e os Acertos sincronizam-no via setValue.
  // Sem alterações, mantém o valor acordado guardado na BD.
  const custoTotalForm = watch("custoTotal");
  const totalBase = Number(custoTotalForm ?? entrada?.custoTotalFinal ?? entrada?.custoTotal ?? 0);

  const pagamentosForm = (watch("pagamentos") ?? []) as PagamentoLedgerItem[];

  // ─── Edição: resumo + Acertos (mesma funcionalidade da modal de pagamento) ───
  if (isEdit && entrada) {
    const pagamentosEntrada: PagamentoLedgerItem[] = (entrada.pagamentos ?? []).map((p) => ({
      id: p.id,
      valor: Number(p.valor),
      metodo: p.metodo as PagamentoLedgerItem["metodo"],
      nota: p.nota ?? null,
      createdAt: p.createdAt,
    }));
    const recebido = totalPago(pagamentosEntrada);
    const falta = faltaPagar(totalBase, pagamentosEntrada);
    const liquidado = falta <= EPS && totalBase > 0;

    // Acertos: write-through na BD pelo backend; sincronizar o custoTotal do
    // form para o "Guardar Alterações" não desfazer o acerto.
    const aplicarAjuste = (delta: number) => {
      setValue("custoTotal", Math.round((totalBase + delta) * 100) / 100);
    };
    const redefinirTotal = (novoTotal: number) => {
      setValue("custoTotal", Math.round(novoTotal * 100) / 100);
    };

    return (
      <PagamentoCard acao={<BotaoGerirPagamento onClick={onOpenPagamento} />}>
        <InlineTabs
          ariaLabel="Pagamento da entrada livre"
          tabs={[
            {
              id: "pagamento",
              label: "Pagamento",
              icon: CreditCard,
              content: (
                <PagamentoResumo
                  items={[
                    {
                      label: "Estado",
                      value: liquidado ? "Pago" : "Por pagar",
                      tone: liquidado ? "verde" : "laranja",
                    },
                    { label: "Valor total", value: formatEuro(totalBase) },
                    { label: "Valor pago", value: formatEuro(recebido) },
                    ...(falta > 0
                      ? [{ label: "Falta", value: formatEuro(falta), tone: "laranja" as const }]
                      : []),
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
              ),
            },
            {
              id: "acertos",
              label: "Acertos",
              icon: ArrowUpDown,
              content: (
                <AjustesPagamentoSection
                  entradaLivreId={entrada.id}
                  numCriancas={Array.isArray(entrada.criancas) ? entrada.criancas.length : 0}
                  onAjusteAplicado={aplicarAjuste}
                  onTotalRedefinido={redefinirTotal}
                />
              ),
            },
          ]}
        />
      </PagamentoCard>
    );
  }

  // ─── Criação ────────────────────────────────────────────────
  // Ledger de pagamentos + breakdown do total calculado. Sem tab "Acertos":
  // ainda não existe ID - correcções formais ficam disponíveis logo após criar.
  return (
    <PagamentoCard>
      <div className="space-y-3">
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

      <BreakdownEntrada
        custoComponentes={custoComponentes}
        custoFinal={custoCalculado}
        precoMeias={precoMeias}
        meias={meias}
        duracaoLabel={duracaoLabel}
        comTitulo
      />
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
