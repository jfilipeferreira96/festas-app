"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Cake, Users, Tv, Minimize2 } from "lucide-react";
import { memo } from "react";
import { useTVMode } from "@/hooks/use-tv-mode";

type FestaTV = {
  id: string;
  nomeFesta: string;
  cor: string | null;
  numCriancas: number | null;
  inicioEm: string | null;
  fimPrevisto: string | null;
  localNome: string;
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

type TVData = {
  festas: FestaTV[];
  entradas: EntradaTV[];
};

async function fetchTVData(): Promise<TVData> {
  const res = await fetch("/api/festas-acabar/tv", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch TV data");
  return res.json();
}

function FestaCard({ festa }: { festa: FestaTV }) {
  const cor = festa.cor || "#6366f1";
  const fimPrevisto = festa.fimPrevisto ? new Date(festa.fimPrevisto) : null;
  const isEndingSoon = fimPrevisto
    ? fimPrevisto.getTime() - Date.now() <= 5 * 60 * 1000
    : false;

  return (
    <div
      className="flex items-center gap-6 rounded-2xl border-2 p-6 transition-all"
      style={{
        borderColor: cor,
        backgroundColor: `${cor}15`,
        boxShadow: isEndingSoon ? `0 0 24px ${cor}40` : "none",
      }}
    >
      {/* Pulseira colorida */}
      <div
        className="h-16 w-16 shrink-0 rounded-full border-4 border-white shadow-lg"
        style={{ backgroundColor: cor }}
      />

      <div className="flex-1 min-w-0">
        <p className="text-4xl font-bold text-text-primary truncate" style={{ color: cor }}>
          {festa.nomeFesta}
        </p>
        <div className="flex items-center gap-4 mt-2">
          <span className="text-2xl text-text-muted">
            {festa.localNome}
          </span>
          {festa.numCriancas != null && festa.numCriancas > 0 && (
            <span className="text-2xl text-text-muted">
              · {festa.numCriancas} crianças
            </span>
          )}
        </div>
      </div>

      {fimPrevisto && (
        <div className="text-right shrink-0">
          <p className="text-3xl font-bold text-text-primary">
            {format(fimPrevisto, "HH:mm")}
          </p>
          <p className="text-xl text-text-muted">
            {isEndingSoon ? "A sair" : "Fim"}
          </p>
        </div>
      )}
    </div>
  );
}

function EntradaCard({ entrada }: { entrada: EntradaTV }) {
  const fimPrevisto = entrada.fimPrevisto ? new Date(entrada.fimPrevisto) : null;

  return (
    <div className="flex items-center gap-4 rounded-2xl border-2 border-border bg-surface p-5">
      <div className="h-12 w-12 shrink-0 rounded-full bg-primary-400/20 flex items-center justify-center">
        <Users className="h-6 w-6 text-primary-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-3xl font-bold text-text-primary truncate">
          {entrada.criancasNomes}
        </p>
        <p className="text-xl text-text-muted mt-1">
          {entrada.encarregadoNome}
        </p>
      </div>

      {fimPrevisto && (
        <div className="text-right shrink-0">
          <p className="text-2xl font-bold text-text-primary">
            {format(fimPrevisto, "HH:mm")}
          </p>
        </div>
      )}
    </div>
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

  return (
    <div className="min-h-screen flex flex-col p-8 gap-6 relative">
      {/* Cabeçalho minimal — apenas título grande */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Cake className="h-12 w-12 text-primary-500" />
          <h1 className="text-5xl font-bold text-text-primary">
            Festas a Acabar
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-2xl text-text-muted">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: pt })}
          </p>
          {/* Botão Modo Ecrã — alterna fullscreen TV */}
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

      {/* Duas colunas: festas (esquerda) + entradas livres (direita) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 min-h-0">
        {/* Coluna esquerda — Festas de aniversariante */}
        <div className="flex flex-col gap-4 min-h-0">
          <h2 className="text-3xl font-bold text-text-secondary shrink-0">
            Festas
          </h2>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {isLoading && (
              <p className="text-3xl text-text-muted text-center py-12">
                A carregar...
              </p>
            )}
            {!isLoading && festas.length === 0 && (
              <p className="text-3xl text-text-muted text-center py-12">
                Nenhuma festa a acabar nos próximos minutos
              </p>
            )}
            {festas.map((festa) => (
              <FestaCard key={festa.id} festa={festa} />
            ))}
          </div>
        </div>

        {/* Coluna direita — Entradas livres */}
        <div className="flex flex-col gap-4 min-h-0">
          <h2 className="text-3xl font-bold text-text-secondary shrink-0">
            Entradas Livres
          </h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {isLoading && (
              <p className="text-3xl text-text-muted text-center py-12">
                A carregar...
              </p>
            )}
            {!isLoading && entradas.length === 0 && (
              <p className="text-3xl text-text-muted text-center py-12">
                Sem entradas livres ativas
              </p>
            )}
            {entradas.map((entrada) => (
              <EntradaCard key={entrada.id} entrada={entrada} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FestasAcabarTVContent = memo(FestasAcabarTVContentInner);
export default FestasAcabarTVContent;
