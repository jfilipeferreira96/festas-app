"use client";

import { CheckCircle2, CreditCard, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";

interface PagamentoCardProps {
  titulo?: string;
  acao?: ReactNode;
  children?: ReactNode;
}

export function PagamentoCard({ titulo = "Pagamento", acao, children }: PagamentoCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <CreditCard size={14} className="text-brand-500" /> {titulo}
        </span>
        {acao}
      </div>
      {children}
    </div>
  );
}

export function BotaoGerirPagamento({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" onClick={onClick} className="shrink-0">
      <Wallet size={14} /> Gerir pagamento
    </Button>
  );
}

interface PagamentoResumoItem {
  label: string;
  value: string;
  tone?: "verde" | "laranja" | "forte";
}

const TONE_CLASSES: Record<NonNullable<PagamentoResumoItem["tone"]>, string> = {
  verde: "text-accent-green-600 font-semibold",
  laranja: "text-accent-orange-600 font-semibold",
  forte: "font-semibold",
};

export function PagamentoResumo({ items }: { items: PagamentoResumoItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{item.label}</p>
          <p className={`text-sm text-text-primary truncate ${item.tone ? TONE_CLASSES[item.tone] : ""}`}>
            {item.tone === "verde" && <CheckCircle2 size={12} className="inline mr-1 -mt-0.5" />}
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
