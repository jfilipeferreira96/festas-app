"use client";

import React, { useState } from "react";

export interface InlineTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  content: React.ReactNode;
}

interface InlineTabsProps {
  tabs: InlineTabItem[];
  ariaLabel?: string;
}

/**
 * Tabs INLINE (não-modal) com a mesma interacção das modais de pagamento
 * (PagamentoModalShell): barra superior + conteúdo da tab activa.
 * Usada nas secções de pagamento dos forms (Pagamento / Acertos).
 */
export default function InlineTabs({ tabs, ariaLabel }: InlineTabsProps) {
  const [activa, setActiva] = useState(tabs[0]?.id ?? "");
  const current = tabs.find((t) => t.id === activa) ?? tabs[0];
  const multi = tabs.length > 1;

  return (
    <div className="space-y-3">
      {multi && (
        <div role="tablist" aria-label={ariaLabel} className="flex items-center gap-1 border-b border-border">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActiva = t.id === current?.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={isActiva}
                type="button"
                onClick={() => setActiva(t.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium -mb-px border-b-2 transition-colors ${
                  isActiva
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-text-muted hover:text-text-primary"
                }`}
              >
                {Icon && <Icon size={13} />} {t.label}
              </button>
            );
          })}
        </div>
      )}
      <div role="tabpanel">{current?.content}</div>
    </div>
  );
}
