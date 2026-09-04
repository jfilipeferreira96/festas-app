"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/select";
import InputField from "@/components/form/input/InputField";
import Checkbox from "@/components/form/input/Checkbox";
import FieldLabel from "@/components/form/FieldLabel";
import { formatEuro } from "@/lib/format";
import { METODO_PAGAMENTO_OPTIONS, metodoPagamentoLabel } from "@/lib/metodo-pagamento";
import type { EntradaLivre } from "@/lib/api/entradaLivre";
import { BotaoGerirPagamento, PagamentoCard, PagamentoResumo } from "@/components/shared/PagamentoCard";
import {
  DURACAO_ENTRADA_OPTIONS,
  ESTADO_PAGAMENTO_OPTIONS,
  type EntradaLivreFormData,
  type EntradaLivreMetodoPagamento,
} from "../entrada-livre-form.schema";

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
  custoFinal: number;
  precoMeias: number;
  onOpenPagamento: () => void;
}

export default function PagamentoEntradaSection({
  entrada,
  custoComponentes,
  custoFinal,
  precoMeias,
  onOpenPagamento,
}: PagamentoEntradaSectionProps) {
  const isEdit = !!entrada;
  const { setValue, watch, formState: { errors } } = useFormContext<EntradaLivreFormData>();
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
          <div>
            <FieldLabel required>Estado do pagamento</FieldLabel>
            <Select
              options={ESTADO_PAGAMENTO_OPTIONS}
              placeholder="Seleccionar..."
              value={watch("pago") === undefined ? "" : watch("pago") ? "true" : "false"}
              onChange={(val) => setValue("pago", val === "true", { shouldValidate: true, shouldDirty: true })}
              error={!!errors.pago}
            />
            {errors.pago && <p className="text-xs text-error-500 mt-1">{errors.pago.message}</p>}
          </div>
          <div>
            <FieldLabel>Método de pagamento</FieldLabel>
            <Select
              options={METODO_PAGAMENTO_OPTIONS}
              placeholder="Seleccionar método"
              value={watch("metodoPagamento") ?? "NONE"}
              onChange={(val) =>
                setValue(
                  "metodoPagamento",
                  val === "NONE" ? undefined : (val as EntradaLivreMetodoPagamento),
                  { shouldDirty: true }
                )
              }
            />
          </div>
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

      {!isEdit && (
        <div className="border-t border-border pt-3 space-y-2">
          <Checkbox
            checked={showSplit}
            onChange={(checked) => {
              setShowSplit(checked);
              if (!checked) {
                setValue("metodoPagamento2", undefined, { shouldDirty: true });
                setValue("valorPago2", 0, { shouldDirty: true });
              }
            }}
            label="Dividir pagamento (2º método)"
          />
          {showSplit && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <FieldLabel>2º Método</FieldLabel>
                <Select
                  options={METODO_PAGAMENTO_OPTIONS}
                  placeholder="2º método"
                  value={watch("metodoPagamento2") ?? "NONE"}
                  onChange={(val) =>
                    setValue(
                      "metodoPagamento2",
                      val === "NONE" ? undefined : (val as EntradaLivreMetodoPagamento),
                      { shouldDirty: true }
                    )
                  }
                />
              </div>
              <div>
                <FieldLabel>Valor 2º Método (€)</FieldLabel>
                <InputField
                  type="number"
                  step={0.01}
                  min={0}
                  placeholder="0,00"
                  value={watch("valorPago2") ?? 0}
                  onChange={(e) => setValue("valorPago2", e.target.value === "" ? 0 : parseFloat(e.target.value), { shouldDirty: true })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-1.5">
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
    </PagamentoCard>
  );
}
