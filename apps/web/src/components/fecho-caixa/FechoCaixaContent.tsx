"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Banknote, CreditCard, Wallet, Printer, ArrowUpDown, CornerUpRight, Plus, Minus } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import DatePicker from "@/components/form/date-picker";
import { useFechoCaixa } from "@/hooks/use-fecho-caixa";
import { imprimirFechoCaixa } from "@/utils/print-fecho-caixa";
import type { MetodoFecho, FechoCaixaAjuste } from "@/lib/api/fecho-caixa";

const fmtEuro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

const METODO_CARDS: Array<{ metodo: MetodoFecho; label: string }> = [
  { metodo: "DINHEIRO", label: "Dinheiro" },
  { metodo: "MBWAY", label: "MB WAY" },
  { metodo: "MULTIBANCO", label: "Multibanco" },
  { metodo: "TRANSFERENCIA", label: "Transferência" },
  { metodo: "CARTAO", label: "Cartão" },
  { metodo: "OUTRO", label: "Outro" },
];

function hojeISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

interface FechoCaixaContentProps {
  /** Quando renderizado dentro de outra página (tab), omite o PageHeader e margens globais. */
  embedded?: boolean;
}

export default function FechoCaixaContent({ embedded = false }: FechoCaixaContentProps) {
  const [data, setData] = useState(hojeISO());
  const { data: fecho, isLoading } = useFechoCaixa(data);

  const handleDateChange = useCallback((dates: Date[]) => {
    if (dates[0]) {
      const d = dates[0];
      setData(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
  }, []);

  const handlePrint = useCallback(() => {
    if (fecho) imprimirFechoCaixa(fecho);
  }, [fecho]);

  const dataFmt = useMemo(
    () =>
      new Date(`${data}T12:00:00`).toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [data]
  );

  return (
    <div>
      {!embedded && (
        <PageHeader title="Fecho de Caixa" subtitle={`Quanto se recebeu — ${dataFmt}`} />
      )}

      {/* Controlos */}
      <div className={`${embedded ? "" : "mt-4"} flex flex-wrap items-end gap-3`}>
        <div className="w-56">
          <DatePicker id="fecho-caixa-data" label="Dia" defaultDate={data} onChange={handleDateChange} />
        </div>
        <Button type="button" onClick={handlePrint} disabled={!fecho} className="shrink-0">
          <Printer size={16} className="mr-1.5" /> Imprimir
        </Button>
      </div>

      {isLoading || !fecho ? (
        <div className={`${embedded ? "mt-4" : "mt-6"} bg-surface rounded-[14px] p-8 shadow-card border border-border animate-pulse`}>
          <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      ) : (
        <>
          {/* Destaques: numerário / eletrónico / total */}
          <div className={`${embedded ? "mt-4" : "mt-6"} grid grid-cols-1 sm:grid-cols-3 gap-3`}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-card">
              <div className="w-10 h-10 rounded-full bg-accent-green-100 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-accent-green-600" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted leading-tight">Numerário</p>
                <p className="text-xl font-bold text-text-primary font-poppins leading-tight">
                  {fmtEuro.format(fecho.numerario)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-card">
              <div className="w-10 h-10 rounded-full bg-accent-teal-100 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-accent-teal-600" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted leading-tight">Eletrónico</p>
                <p className="text-xl font-bold text-text-primary font-poppins leading-tight">
                  {fmtEuro.format(fecho.eletronico)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-card">
              <div className="w-10 h-10 rounded-full bg-accent-orange-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-accent-orange-600" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted leading-tight">Total do dia</p>
                <p className="text-xl font-bold text-text-primary font-poppins leading-tight">
                  {fmtEuro.format(fecho.total)}
                </p>
              </div>
            </div>
          </div>

          {/* Por método */}
          <div className={`${embedded ? "mt-3" : "mt-4"} bg-surface rounded-[14px] p-5 shadow-card border border-border`}>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Por método de pagamento</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {METODO_CARDS.map(({ metodo, label }) => (
                <div
                  key={metodo}
                  className={`rounded-lg border p-3 ${
                    fecho.porMetodo[metodo] > 0 ? "border-border bg-surface" : "border-border/50 opacity-50"
                  }`}
                >
                  <p className="text-[11px] text-text-muted">{label}</p>
                  <p className="text-base font-bold text-text-primary tabular-nums">
                    {fmtEuro.format(fecho.porMetodo[metodo])}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-muted border-t border-border pt-3">
              <span>Festas: <strong className="text-text-secondary">{fmtEuro.format(fecho.detalhe.festas)}</strong></span>
              <span>Entradas livres: <strong className="text-text-secondary">{fmtEuro.format(fecho.detalhe.entradasLivres)}</strong></span>
              <span>Outros (cauções, excesso, meias): <strong className="text-text-secondary">{fmtEuro.format(fecho.detalhe.outros)}</strong></span>
            </div>
          </div>

          {/* Ajustes do dia — auditoria */}
          <div className={`${embedded ? "mt-3" : "mt-4"} bg-surface rounded-[14px] p-5 shadow-card border border-border`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <ArrowUpDown size={14} className="text-text-muted" /> Ajustes do dia
              </h2>
              {fecho.ajustes.length > 0 && (
                <span
                  className={`text-xs font-bold ${
                    fecho.ajustesLiquido >= 0 ? "text-accent-green-600" : "text-accent-red-500"
                  }`}
                >
                  Líquido: {fecho.ajustesLiquido >= 0 ? "+" : "−"} {fmtEuro.format(Math.abs(fecho.ajustesLiquido))}
                </span>
              )}
            </div>
            {fecho.ajustes.length === 0 ? (
              <p className="text-xs text-text-muted">Sem ajustes registados neste dia.</p>
            ) : (
              <div className="space-y-1.5">
                {fecho.ajustes.map((a) => (
                  <AjusteRow key={a.id} ajuste={a} />
                ))}
              </div>
            )}
            <p className="mt-3 text-[11px] text-text-muted">
              Os ajustes já estão incluídos nos totais acima (aplicados nos pagamentos). Esta lista é para auditoria.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function AjusteRow({ ajuste }: { ajuste: FechoCaixaAjuste }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-surface border border-border">
      {ajuste.tipo === "ACRESCIMO" ? (
        <Plus size={14} className="text-accent-green-600 mt-0.5 shrink-0" />
      ) : ajuste.tipo === "REDEFINICAO" ? (
        <CornerUpRight size={14} className="text-brand-600 mt-0.5 shrink-0" />
      ) : (
        <Minus size={14} className="text-accent-red-500 mt-0.5 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-sm font-semibold ${
              ajuste.tipo === "ACRESCIMO"
                ? "text-accent-green-600"
                : ajuste.tipo === "REDEFINICAO"
                  ? "text-brand-700"
                  : "text-accent-red-500"
            }`}
          >
            {ajuste.tipo === "ACRESCIMO" ? "+" : ajuste.tipo === "REDEFINICAO" ? "Redefinição →" : "−"}{" "}
            {fmtEuro.format(ajuste.valor)}
          </span>
          {ajuste.precoPorCabeca != null && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
              {fmtEuro.format(ajuste.precoPorCabeca)}/criança
            </span>
          )}
          <span className="text-[10px] text-text-muted">
            {ajuste.reservaId ? "Festa" : "Entrada livre"}
            {ajuste.criadoPor ? ` · ${ajuste.criadoPor.name}` : ""} ·{" "}
            {new Date(ajuste.createdAt).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-xs text-text-secondary whitespace-pre-wrap break-words">{ajuste.motivo}</p>
      </div>
    </div>
  );
}
