"use client";

import React, { useState } from "react";
import { DoorOpen, PartyPopper, Sparkles } from "lucide-react";
import FestasContent from "@/components/festas/FestasContent";
import EntradasAtivasContent from "@/components/entradas-livres/EntradasAtivasContent";

type Aba = "tudo" | "festas" | "entradas";

const ABAS: { value: Aba; label: string; icon: React.ReactNode }[] = [
  { value: "tudo", label: "Tudo", icon: <Sparkles className="w-4 h-4" /> },
  { value: "festas", label: "Festas", icon: <PartyPopper className="w-4 h-4" /> },
  { value: "entradas", label: "Entradas Livres", icon: <DoorOpen className="w-4 h-4" /> },
];


export default function ADecorrerContent() {
  const [aba, setAba] = useState<Aba>("tudo");

  return (
    <div>
      {/* Abas no topo */}
      <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs w-fit">
        {ABAS.map((a) => (
          <button
            key={a.value}
            onClick={() => setAba(a.value)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              aba === a.value
                ? "bg-brand-500 text-white shadow-theme-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        Vista em tempo real — atualiza automaticamente a cada 30 segundos.
      </p>

      <div className="mt-6 space-y-10">
        {(aba === "tudo" || aba === "festas") && (
          <section>
            {aba === "tudo" && (
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <PartyPopper size={14} className="text-brand-500" /> Festas
              </h2>
            )}
            <FestasContent />
          </section>
        )}
        {(aba === "tudo" || aba === "entradas") && (
          <section>
            {aba === "tudo" && (
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <DoorOpen size={14} className="text-brand-500" /> Entradas Livres
              </h2>
            )}
            <EntradasAtivasContent />
          </section>
        )}
      </div>
    </div>
  );
}
