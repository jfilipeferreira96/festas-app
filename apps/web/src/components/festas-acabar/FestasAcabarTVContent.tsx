"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Cake, Clock, DoorOpen, PartyPopper, Tv, Minimize2 } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { useTVMode } from "@/hooks/use-tv-mode";

type FestaTV = {
  id: string;
  nomeFesta: string;
  cor: string | null;
  numCriancas: number | null;
  inicioEm: string | null;
  fimPrevisto: string | null;
  estado: string;
};

type EntradaTV = {
  id: string;
  criancasNomes: string;
  encarregadoNome: string;
  inicioEm: string | null;
  fimPrevisto: string | null;
  duracaoMinutos: number;
  numCriancas: number;
};

type LancheTV = {
  id: string;
  nomeFesta: string;
  cor: string | null;
  horaLanche: string;
  numCriancas: number;
};

type TVData = {
  festas: FestaTV[];
  entradas: EntradaTV[];
  lanches: LancheTV[];
};

async function fetchTVData(): Promise<TVData> {
  const res = await fetch("/api/festas-acabar/tv", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch TV data");
  return res.json();
}

/** Secções fixas da vista TV (sem tabs - pedido do cliente, 21/09/2026). */
const SECCOES: { label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "FESTAS ACABAR", icon: PartyPopper },
  { label: "ENTRADAS LIVRES", icon: DoorOpen },
  { label: "LANCHES", icon: Cake },
];

/** Relógio isolado no próprio componente: só ele re-renderiza a cada segundo. */
function RelogioTV() {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-3 text-3xl font-bold text-text-primary">
      <Clock className="h-7 w-7 text-text-muted" />
      {format(agora, "HH:mm")}
    </div>
  );
}

function FestaCard({ festa }: { festa: FestaTV }) {
  const cor = festa.cor || "#6366f1";
  const fimPrevisto = festa.fimPrevisto ? new Date(festa.fimPrevisto) : null;
  const isAtrasada = fimPrevisto ? fimPrevisto.getTime() < Date.now() : false;

  return (
    <div
      className="flex items-center gap-6 rounded-2xl border-2 p-6 transition-all"
      style={{
        borderColor: cor,
        backgroundColor: `${cor}15`,
        boxShadow: isAtrasada ? `0 0 24px ${cor}40` : "none",
      }}
    >
      <div
        className="h-16 w-16 shrink-0 rounded-full border-4 border-white shadow-lg"
        style={{ backgroundColor: cor }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-4xl font-bold text-text-primary truncate" style={{ color: cor }}>
          {festa.nomeFesta}
        </p>
        <div className="flex items-center gap-4 mt-2">
          {festa.numCriancas != null && festa.numCriancas > 0 && (
            <span className="text-2xl text-text-muted">{festa.numCriancas} crianças</span>
          )}
        </div>
      </div>

      {fimPrevisto && (
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-text-primary">{format(fimPrevisto, "HH:mm")}</p>
          <p className="text-xl text-text-muted">{isAtrasada ? "Em excesso" : "A sair"}</p>
        </div>
      )}
    </div>
  );
}

function EntradaCard({ entrada }: { entrada: EntradaTV }) {
  const fimPrevisto = entrada.fimPrevisto ? new Date(entrada.fimPrevisto) : null;
  const isAtrasada = fimPrevisto ? fimPrevisto.getTime() < Date.now() : false;

  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-surface p-5">
      <div className="h-12 w-12 shrink-0 rounded-full bg-primary-400/20 flex items-center justify-center">
        <Users className="h-6 w-6 text-primary-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-3xl font-bold text-text-primary truncate">{entrada.criancasNomes}</p>
        <p className="text-xl text-text-muted mt-1">{entrada.encarregadoNome}</p>
      </div>

      {fimPrevisto && (
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-text-primary">{format(fimPrevisto, "HH:mm")}</p>
          <p className={`text-lg ${isAtrasada ? "text-accent-red font-semibold" : "text-text-muted"}`}>
            {isAtrasada ? "Em excesso" : "Saída"}
          </p>
        </div>
      )}
    </div>
  );
}

function LancheCard({ lanche }: { lanche: LancheTV }) {
  const cor = lanche.cor || "#f59e0b";
  return (
    <div
      className="flex items-center gap-6 rounded-2xl border-2 p-6"
      style={{ borderColor: cor, backgroundColor: `${cor}15` }}
    >
      <div className="h-16 w-16 shrink-0 rounded-full bg-accent-orange-100 flex items-center justify-center">
        <Cake className="h-8 w-8 text-accent-orange-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-4xl font-bold text-text-primary truncate">{lanche.nomeFesta}</p>
        {lanche.numCriancas > 0 && (
          <p className="text-2xl text-text-muted mt-1">{lanche.numCriancas} crianças</p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-3xl font-bold text-text-primary">{lanche.horaLanche}</p>
        <p className="text-xl text-accent-orange-600 font-semibold">Chamar para o lanche</p>
      </div>
    </div>
  );
}

// Icone Users para EntradaCard (evita import duplicado no topo)
function Users({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FestasAcabarTVContentInner() {
  const { isTVMode, toggleTVMode } = useTVMode();
  const { data, isLoading } = useQuery<TVData>({
    queryKey: ["festas-acabar-tv"],
    queryFn: fetchTVData,
    refetchInterval: 30_000, // Auto-refresh a cada 30 segundos
    refetchOnWindowFocus: false,
  });

  const festas = data?.festas ?? [];
  const entradas = data?.entradas ?? [];
  const lanches = data?.lanches ?? [];

  const seccoes = [
    { ...SECCOES[0], itens: festas, vazia: "Nenhuma festa a acabar nos próximos minutos" },
    { ...SECCOES[1], itens: entradas, vazia: "Sem entradas livres a acabar" },
    { ...SECCOES[2], itens: lanches, vazia: "Sem lanches a chegar nos próximos minutos" },
  ];

  return (
    <div className="min-h-screen flex flex-col p-8 gap-6 relative">
      {/* Cabeçalho: data + relógio no topo + modo ecrã */}
      <div className="flex items-center justify-between shrink-0">
        <p className="text-2xl text-text-muted">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
        </p>
        <div className="flex items-center gap-6">
          <RelogioTV />
          <button
            onClick={toggleTVMode}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-lg font-medium text-text-secondary hover:bg-brand-500/5 transition-colors"
            title={isTVMode ? "Sair do modo ecrã" : "Modo ecrã"}
          >
            {isTVMode ? <Minimize2 className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
            <span className="hidden sm:inline">{isTVMode ? "Sair" : "Ecrã"}</span>
          </button>
        </div>
      </div>

      {/* Listas fixas (sem tabs): Festas · Entradas Livres · Lanches */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 min-h-0">
        {isLoading && <p className="text-3xl text-text-muted text-center py-12">A carregar...</p>}
        {!isLoading &&
          seccoes.map(({ label, icon: Icon, itens, vazia }) => (
            <section key={label} className="space-y-4">
              <div className="flex items-center gap-3">
                <Icon className="h-7 w-7 text-text-secondary" />
                <h2 className="text-2xl font-bold text-text-secondary">{label}</h2>
                {itens.length > 0 && (
                  <span className="px-3 py-0.5 rounded-full text-lg bg-brand-50 text-brand-600">
                    {itens.length}
                  </span>
                )}
              </div>
              {itens.length === 0 ? (
                <p className="text-2xl text-text-muted/70 py-4">{vazia}</p>
              ) : (
                itens.map((item) =>
                  label === "FESTAS ACABAR" ? (
                    <FestaCard key={item.id} festa={item as FestaTV} />
                  ) : label === "ENTRADAS LIVRES" ? (
                    <EntradaCard key={item.id} entrada={item as EntradaTV} />
                  ) : (
                    <LancheCard key={item.id} lanche={item as LancheTV} />
                  )
                )
              )}
            </section>
          ))}
      </div>
    </div>
  );
}

const FestasAcabarTVContent = memo(FestasAcabarTVContentInner);
export default FestasAcabarTVContent;
