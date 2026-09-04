"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { METODO_PAGAMENTO_OPTIONS, metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import { PagamentoRegistoSection } from "@/components/shared/pagamento/PagamentoRegistoSection";
import { DURACAO_ENTRADA_OPTIONS, type EntradaLivreFormData, type EntradaLivreMetodoPagamento } from "../entrada-livre-form.schema";

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
  onCustoEditado: () => void;
}

export default function PagamentoEntradaSection({
  entrada,
  custoComponentes,
  custoCalculado,
  precoMeias,
  onOpenPagamento,
  onCustoEditado,
}: PagamentoEntradaSectionProps) {
  const isEdit = !!entrada;
  const { setValue, watch, formState: { errors } } = useFormContext<EntradaLivreFormData>();
  const [registarPagamento, setRegistarPagamento] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  const duracao = watch("duracaoMinutos");
  const meias = watch("meiasQuantidade") ?? 0;
  const duracaoLabel = DURACAO_ENTRADA_OPTIONS.find((o) => o.value === String(duracao))?.label ?? `${duracao}min`;

  const setMeias = (quantidade: number) => setValue("meiasQuantidade", Math.max(0, quantidade), { shouldDirty: true });

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
              value: `${metodoPagamentoLabel(entrada.metodoPagamento, "Não definido")}${
                entrada.metodoPagamento2 ? ` + ${metodoPagamentoLabel(entrada.metodoPagamento2, "")}` : ""
              }`,
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
            <PagamentoRegistoSection
              totalValor={watch("custoTotal")}
              onTotalChange={(v) => {
                onCustoEditado();
                setValue("custoTotal", v, { shouldDirty: true });
              }}
              totalCalculado={custoCalculado}
              erroTotal={errors.custoTotal?.message}
              recebido1={watch("valorRecebido1")}
              onRecebido1Change={(v) => {
                onCustoEditado();
                setValue("valorRecebido1", v, { shouldDirty: true });
              }}
              metodo1={watch("metodoPagamento")}
              onMetodo1Change={(v) =>
                setValue("metodoPagamento", v as EntradaLivreMetodoPagamento | undefined, { shouldDirty: true })
              }
              split={showSplit}
              onSplitToggle={(checked) => {
                setShowSplit(checked);
                if (!checked) {
                  setValue("metodoPagamento2", undefined, { shouldDirty: true });
                  setValue("valorRecebido2", 0, { shouldDirty: true });
                }
              }}
              metodo2={watch("metodoPagamento2")}
              onMetodo2Change={(v) =>
                setValue("metodoPagamento2", v as EntradaLivreMetodoPagamento | undefined, { shouldDirty: true })
              }
              valor2={watch("valorRecebido2") ?? 0}
              onValor2Change={(v) => setValue("valorRecebido2", v, { shouldDirty: true })}
              falta={Math.max((watch("custoTotal") ?? custoCalculado) - (watch("valorRecebido1") ?? 0) - (watch("valorRecebido2") ?? 0), 0)}
              pago={watch("pago") ?? false}
              onPagoChange={(checked) => setValue("pago", checked, { shouldDirty: true })}
              metodoOptions={METODO_PAGAMENTO_OPTIONS}
              breakdown={<BreakdownEntrada custoComponentes={custoComponentes} custoFinal={watch("custoTotal") ?? custoCalculado} precoMeias={precoMeias} meias={meias} duracaoLabel={duracaoLabel} />}
            />
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
          <p className="text-xs text-text-muted">Cobradas automaticamente na conclusão</p>
        </div>
      </div>

      {!isEdit && !registarPagamento && (
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
      <div className="flex items-center justify-between pt-1.5 border-t border-border/50">
        <span className="text-sm font-semibold text-text-primary">Total</span>
        <span className="text-base font-bold text-primary-500">{formatEuro(custoFinal)}</span>
      </div>
    </div>
  );
}
