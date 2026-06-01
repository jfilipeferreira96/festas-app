"use client";

import React from "react";
import Link from "next/link";
import { useUser } from "@/contexts/AuthContext";
import {
  PartyPopper,
  Play,
  Timer,
  Package,
  Calendar,
} from "lucide-react";
import { KPICard, StatusBadge } from "@/components/ui";
import {
  useDashboardKPIs,
  useFestasEmCurso,
  useProximasFestas,
} from "@/hooks/use-dashboard";
import type { ReservaEmCurso, ProximaFesta } from "@/lib/api/dashboard";

interface DashboardContentProps {
  // selectedDate?: Date;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

// Função de data formatada desativada
// function formatDatePT(): string {
//   return new Intl.DateTimeFormat("pt-PT", {
//     weekday: "long",
//     day: "numeric",
//     month: "long",
//     year: "numeric",
//   }).format(new Date());
// }

// Sub-components
const KPIGrid = React.memo(function KPIGrid() {
  const { data: kpis, isLoading } = useDashboardKPIs();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface rounded-[14px] p-5 shadow-card border border-border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Festas Hoje",
      value: kpis?.festasHoje ?? 0,
      icon: <PartyPopper size={22} />,
      iconColor: "#465fff",
      backgroundColor: "var(--color-brand-50)",
    },
    {
      title: "A Começar",
      value: kpis?.aComecar ?? 0,
      icon: <Play size={22} />,
      iconColor: "#FF9F43",
      backgroundColor: "var(--color-accent-orange-50)",
      subtitle: "Próx. 60 min",
    },
    {
      title: "A Terminar",
      value: kpis?.aTerminar ?? 0,
      icon: <Timer size={22} />,
      iconColor: "#E74C3C",
      backgroundColor: "var(--color-accent-red-50)",
      subtitle: "Próx. 60 min",
    },
    {
      title: "Cacifos Ocupados",
      value: kpis ? `${kpis.cacifosOcupados}/${kpis.cacifosTotal}` : "—",
      icon: <Package size={22} />,
      iconColor: "#3dc47e",
      backgroundColor: "var(--color-accent-green-50)",
      subtitle: kpis ? `${kpis.cacifosReservados} reservados` : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KPICard
          key={card.title}
          title={card.title}
          value={card.value}
          icon={card.icon}
          iconColor={card.iconColor}
          backgroundColor={card.backgroundColor}
          subtitle={card.subtitle}
        />
      ))}
    </div>
  );
});

const FestaEmCursoRow = React.memo(function FestaEmCursoRow({ festa }: { festa: ReservaEmCurso }) {
  const inicio = new Date(festa.inicioEm);
  const horaInicio = inicio.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const nomeSala = festa.local?.nome ?? "—";
  const aniversarianteNome = festa.aniversariantes?.[0]?.aniversariante?.nome ?? "—";

  // Find the next pending etapa (first one not concluded, ordered by ordem)
  const proximaEtapa = festa.etapas?.find(e => !e.concluida);
  const todasConcluidas = festa.etapas?.length > 0 && festa.etapas.every(e => e.concluida);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-secondary w-12">{horaInicio}</span>
        <div>
          <p className="text-sm font-semibold text-text-primary">{aniversarianteNome}</p>
          <p className="text-xs text-text-muted">{nomeSala} · {festa.numCriancas ?? 0} crianças</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {todasConcluidas ? (
          <StatusBadge status="CONCLUIDA">Todas concluídas ✓</StatusBadge>
        ) : proximaEtapa ? (
          <StatusBadge status="A_COMECAR">
            {proximaEtapa.etapa?.nome ?? "Próxima etapa"}
          </StatusBadge>
        ) : (
          <StatusBadge status="EM_CURSO">Em curso</StatusBadge>
        )}
      </div>
    </div>
  );
});

const FestasEmCursoSection = React.memo(function FestasEmCursoSection() {
  const { data: festas, isLoading } = useFestasEmCurso();

  return (
    <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
      <h3 className="font-poppins font-semibold text-[16px] text-text-primary mb-3">
        Festas em Curso
      </h3>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : festas && festas.length > 0 ? (
        <div>
          {festas.map((festa) => (
            <FestaEmCursoRow key={festa.id} festa={festa} />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-text-muted">Sem festas em curso no momento.</p>
      )}
    </div>
  );
});

const ProximaFestaRow = React.memo(function ProximaFestaRow({ festa }: { festa: ProximaFesta }) {
  const nomeSala = festa.local?.nome ?? "—";
  const aniversarianteNome = festa.aniversariantes?.[0]?.aniversariante?.nome ?? "—";

  const minutosAteInicio = React.useMemo(() => {
    const agora = new Date();
    const [h, m] = festa.horario.split(":").map(Number);
    const inicio = new Date(agora);
    inicio.setHours(h, m, 0, 0);
    return Math.max(0, Math.round((inicio.getTime() - agora.getTime()) / 60000));
  }, [festa.horario]);

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-text-secondary w-12">{festa.horario}</span>
        <div>
          <p className="text-sm font-semibold text-text-primary">{aniversarianteNome}</p>
          <p className="text-xs text-text-muted">{nomeSala} · {festa.numCriancas} crianças</p>
        </div>
      </div>
      <StatusBadge status="A_COMECAR">
        Em {minutosAteInicio} min
      </StatusBadge>
    </div>
  );
});

const ProximasFestasSection = React.memo(function ProximasFestasSection() {
  const { data: festas, isLoading } = useProximasFestas();

  return (
    <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
      <h3 className="font-poppins font-semibold text-[16px] text-text-primary mb-3">
        Próximas Festas
      </h3>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : festas && festas.length > 0 ? (
        <div>
          {festas.map((festa) => (
            <ProximaFestaRow key={festa.id} festa={festa} />
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-text-muted">Sem festas agendadas para as próximas horas.</p>
      )}
    </div>
  );
});

// Main component
export default function DashboardContent({ }: DashboardContentProps) {
  const { user } = useUser();

  return (
    <div>
      {/* Greeting Section */}
      <div className=" items-center gap-3 mb-6">
        <h2 className="font-poppins font-semibold text-[15px] text-text-primary">
          {getGreeting()}, {user?.name?.split(" ")[0] || "Utilizador"}! 🎉
        </h2>
        <p className="text-[12px] text-text-muted ">
          Aqui está o resumo do seu dia.
        </p>
      </div>

      <KPIGrid />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <FestasEmCursoSection />
        <ProximasFestasSection />
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/calendario"
          className="inline-flex items-center gap-2 text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          Ver calendário completo
        </Link>
      </div>
    </div>
  );
}
