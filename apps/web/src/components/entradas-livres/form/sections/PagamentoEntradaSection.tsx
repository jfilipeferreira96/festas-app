"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentosLedgerSection } from "@/components/shared/pagamento/PagamentosLedgerSection";
import { totalPago, type PagamentoLedgerItem } from "@/lib/pagamento-ledger";
import { DURACAO_ENTRADA_OPTIONS, type EntradaLivreFormData } from "../entrada-livre-form.schema";

interface CustoComponentes {
  totalPessoas: number;
  criancasComLanche: number;
  custoTempo: number;
  custoLanche: number;
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
  const [registarPagamento, setRegistarPagamento] = useState(false);

  const duracao = watch("duracaoMinutos");
  const meias = watch("meiasQuantidade") ?? 0;
  const duracaoLabel = DURACAO_ENTRADA_OPTIONS.find((o) => o.value === String(duracao))?.label ?? `${duracao}min`;

  const setMeias = (quantidade: number) => setValue("meiasQuantidade", Math.max(0, quantidade), { shouldDirty: true });

  const pagamentosForm = (watch("pagamentos") ?? []) as PagamentoLedgerItem[];
  const custo = watch("custoTotal") ?? custoCalculado;

  return (
    <PagamentoCard acao={isEdit && entrada ? <BotaoGerirPagamento onClick={onOpenPagamento} /> : undefined}>
      {isEdit && entrada ? (
        <PagamentoResumo
          items={[
            { label: "Estado", value: entrada.pago ? "Pago" : "Por pagar", tone: entrada.pago ? "verde" : "laranja" },
            {
              label: "Valor total",
              value: formatEuro(Number(entrada.custoTotalFinal ?? entrada.custoTotal ?? 0)),
            },
            {
              label: "Método",
              value:
                (entrada.pagamentos?.length ?? 0) > 0
                  ? entrada.pagamentos!.map((p) => metodoPagamentoLabel(p.metodo)).join(" + ")
                  : "Não definido",
            },
            { label: "Meias", value: `${meias} ${meias === 1 ? "par" : "pares"}` },
          ]}
        />
      ) : (
        <div className="space-y-3">
          <Checkbox
            checked={registarPagamento}
            onChange={setRegistarPagamento}
            label="Registar pagamento na entrada (opcional)"
          />
          {registarPagamento && (
            <>
              {/* Custo total (editável, pré-preenchido com o cálculo) */}
              <div>
                <FieldLabel required>Total a pagar (€)</FieldLabel>
                <div className="flex items-center gap-2">
                  <InputField
                    type="number"
                    step={0.01}
                    min={0}
                    placeholder="0,00"
                    autoComplete="off"
                    value={watch("custoTotal") != null ? String(watch("custoTotal")) : ""}
                    onChange={(e) =>
                      setValue("custoTotal", e.target.value === "" ? undefined : Number(e.target.value), {
                        shouldDirty: true,
                      })
                    }
                  />
                  <span className="text-xs text-text-muted whitespace-nowrap">≈ {formatEuro(custoCalculado)}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-1">
                  Pré-preenchido com o cálculo — editável (valor final acordado).
                </p>
              </div>

              {/* Ledger de pagamentos: adicionar até completar o total; pago é derivado */}
              <PagamentosLedgerSection
                totalDevido={custo}
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
            </>
          )}
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-primary">Meias</span>
          <span className="text-xs text-text-muted">{formatEuro(precoMeias)} / par</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMeias(meias - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary"
            >
              −
            </button>
            <span className="w-10 text-center text-sm font-medium text-text-primary">{meias}</span>
            <button
              type="button"
              onClick={() => setMeias(meias + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-text-secondary"
            >
              +
            </button>
          </div>
          <p className="text-xs text-text-muted">Incluídas no total a pagar</p>
        </div>
      </div>

      {(!isEdit || !registarPagamento) && (
        <BreakdownEntrada
          custoComponentes={custoComponentes}
          custoFinal={custo}
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
      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
        <span className="text-sm font-semibold text-text-primary">Total</span>
        <span className="text-base font-bold text-primary-500">{formatEuro(custoFinal)}</span>
      </div>
    </div>
  );
}
