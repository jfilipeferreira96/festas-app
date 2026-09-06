"use client";

import React, { useState } from "react";
import { CheckCircle2, Wallet, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";

export interface PagamentoTabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  content: React.ReactNode;
}

interface PagamentoModalShellProps {
  titulo: string;
  onClose: () => void;
  onSave: () => void;
  isLoading: boolean;
  pago: boolean;
  metodoLabel?: string;
  heroDireita?: React.ReactNode;
  avisos?: React.ReactNode;
  tabs: PagamentoTabConfig[];
  resumo?: React.ReactNode;
}

export default function PagamentoModalShell({
  titulo,
  onClose,
  onSave,
  isLoading,
  pago,
  metodoLabel,
  heroDireita,
  avisos,
  tabs,
  resumo,
}: PagamentoModalShellProps) {
  const [tabId, setTabId] = useState(tabs[0]?.id ?? "");
  const tabAtiva = tabs.find((t) => t.id === tabId) ?? tabs[0];

  return (
    <Modal isOpen onClose={onClose} size="xl" title={titulo}>
      <div className="p-5 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2.5 min-w-0">
            {pago ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-green-50 border border-accent-green-200 text-accent-green-700 text-xs font-semibold shrink-0">
                <CheckCircle2 size={13} /> Pago
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-orange-50 border border-accent-orange-200 text-accent-orange-700 text-xs font-semibold shrink-0">
                <Wallet size={13} /> Por pagar
              </span>
            )}
            {metodoLabel && <span className="text-xs text-text-muted truncate">{metodoLabel}</span>}
          </div>
          {heroDireita}
        </div>

        {avisos && (
          <div className="p-3 mt-3 rounded-lg bg-accent-orange-50 border border-accent-orange-200 space-y-1.5">
            <p className="text-[10px] font-semibold text-accent-orange-700 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle size={12} /> Avisar os pais
            </p>
            {avisos}
          </div>
        )}

        <div className="flex gap-1 mt-4 border-b border-border shrink-0" role="tablist">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tabAtiva?.id === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTabId(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-brand-500 text-brand-700"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                <Icon size={14} /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pt-4">{tabAtiva?.content}</div>

        <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-border shrink-0">
          <div className="text-xs text-text-muted min-w-0 truncate">{resumo}</div>
          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={isLoading}>
              {isLoading ? "A guardar..." : "Guardar Pagamento"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
