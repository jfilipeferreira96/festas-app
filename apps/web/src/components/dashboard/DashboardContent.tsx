"use client";

import React from "react";
import Link from "next/link";
import { useUser } from "@/contexts/AuthContext";
import {
  PartyPopper,
  Play,
  Calendar,
  DoorOpen,
  CheckCircle2,
  Package,
  Lock,
  Clock,
  Users,
} from "lucide-react";
import { StatusBadge } from "@/components/ui";
import {
  useDashboardKPIs,
  useFestasEmCurso,
  useProximasFestas,
} from "@/hooks/use-dashboard";
import { useEntradasLivresContadores } from "@/hooks/use-entrada-livre";
import type { ReservaEmCurso, ProximaFesta } from "@/lib/api/dashboard";
import AniversariosProximosCard from "@/components/dashboard/AniversariosProximosCard";

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

// ── MiniStat (sub-card dentro de um cartão contextual) ──────────
interface MiniStatProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
  color: string;       // cor do ícone e do valor (hex)
  bgColor?: string;    // cor de fundo do sub-card (opcional - se omitido, fica transparente)
}

const MiniStat = React.memo(function MiniStat({
  label,
  value,
  hint,
  icon,
  color,
  bgColor,
}: MiniStatProps) {
  return (
    <div
      className="rounded-[10px] p-3 flex flex-col gap-1.5 min-w-0"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <p className="text-[11px] font-medium text-text-secondary truncate">
          {label}
        </p>
      </div>
      <p
        className="font-poppins text-[24px] font-bold leading-none"
        style={{ color }}
      >
        {value}
      </p>
      {hint && <p className="text-[10px] text-text-muted truncate">{hint}</p>}
    </div>
  );
});

// ── ContextualCard (cartão wrapper com header + grid de mini-stats) ──
interface ContextualCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  children: React.ReactNode;
  columns?: 2 | 3;
}

const ContextualCard = React.memo(function ContextualCard({
  title,
  icon,
  iconColor,
  children,
  columns = 3,
}: ContextualCardProps) {
  return (
    <div
      className="rounded-[14px] border border-border p-5 shadow-card flex flex-col"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-[10px] shrink-0"
          style={{ backgroundColor: `${iconColor}15`, color: iconColor }}
        >
          {icon}
        </span>
        <h3 className="font-poppins font-semibold text-[15px] text-text-primary">
          {title}
        </h3>
      </div>
      <div
        className={columns === 2 ? "grid grid-cols-2 gap-3" : "grid grid-cols-3 gap-3"}
      >
        {children}
      </div>
    </div>
  );
});

// ── Grid principal de cartões contextuais ────────────────────────
const KPIGrid = React.memo(function KPIGrid() {
  const { data: kpis, isLoading: loadingKpis } = useDashboardKPIs();
  const { data: festasEmCurso } = useFestasEmCurso();
  const { data: proximasFestas } = useProximasFestas();
  const { data: contadores, isLoading: loadingCont } =
    useEntradasLivresContadores();

  const cacifosTotal = kpis?.cacifosTotal ?? 0;
  const cacifosOcupados = kpis?.cacifosOcupados ?? 0;
  const cacifosReservados = kpis?.cacifosReservados ?? 0;
  const cacifosLivres = Math.max(
    0,
    cacifosTotal - cacifosOcupados - cacifosReservados
  );

  if (loadingKpis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-[14px] p-5 shadow-card border border-border animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-16 bg-gray-100 rounded" />
              <div className="h-16 bg-gray-100 rounded" />
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ── Paletas por cartão (Opção A - 1 cor por cartão) ──
  // Reduz ruído visual: cada cartão usa apenas a sua cor de acento.
  const palette = {
    festas:   { fg: "#465fff", bg: "var(--color-brand-50)" },
    entradas: { fg: "#8648a0", bg: "var(--color-accent-purple-50)" },
    cacifos:  { fg: "#3dc47e", bg: "var(--color-accent-green-50)" },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* ── Cartão Festas ── */}
      <ContextualCard
        title="Festas"
        icon={<PartyPopper size={20} />}
        iconColor={palette.festas.fg}
      >
        <MiniStat
          label="Hoje"
          value={kpis?.festasHoje ?? 0}
          icon={<Calendar size={16} />}
          color={palette.festas.fg}
          bgColor={palette.festas.bg}
        />
        <MiniStat
          label="Em Curso"
          value={festasEmCurso?.length ?? 0}
          icon={<Play size={16} />}
          color={palette.festas.fg}
          bgColor={palette.festas.bg}
        />
        <MiniStat
          label="Próximas"
          value={proximasFestas?.length ?? 0}
          icon={<Clock size={16} />}
          color={palette.festas.fg}
          bgColor={palette.festas.bg}
        />
      </ContextualCard>

      {/* ── Cartão Entradas Livres ── */}
      <ContextualCard
        title="Entradas Livres"
        icon={<DoorOpen size={20} />}
        iconColor={palette.entradas.fg}
        columns={3}
      >
        <MiniStat
          label="Ativas"
          value={loadingCont ? "-" : contadores?.ativas ?? 0}
          hint="No espaço agora"
          icon={<DoorOpen size={16} />}
          color={palette.entradas.fg}
          bgColor={palette.entradas.bg}
        />
        <MiniStat
          label="Concluídas Hoje"
          value={loadingCont ? "-" : contadores?.concluidasHoje ?? 0}
          hint={
            contadores
              ? `Total hoje: ${contadores.totalHoje}`
              : undefined
          }
          icon={<CheckCircle2 size={16} />}
          color={palette.entradas.fg}
          bgColor={palette.entradas.bg}
        />
        <MiniStat
          label="Crianças no Parque"
          value={kpis?.totalCriancasNoParque ?? 0}
          hint={`Festas: ${kpis?.criancasFestas ?? 0} · Entradas: ${kpis?.criancasEntradas ?? 0}`}
          icon={<Users size={16} />}
          color={palette.entradas.fg}
          bgColor={palette.entradas.bg}
        />
      </ContextualCard>

      {/* ── Cartão Cacifos ── */}
      <ContextualCard
        title="Cacifos"
        icon={<Package size={20} />}
        iconColor={palette.cacifos.fg}
      >
        <MiniStat
          label="Ocupados"
          value={cacifosOcupados}
          icon={<Lock size={16} />}
          color={palette.cacifos.fg}
          bgColor={palette.cacifos.bg}
        />
        <MiniStat
          label="Reservados"
          value={cacifosReservados}
          icon={<Package size={16} />}
          color={palette.cacifos.fg}
          bgColor={palette.cacifos.bg}
        />
        <MiniStat
          label="Livres"
          value={cacifosLivres}
          hint={`de ${cacifosTotal}`}
          icon={<CheckCircle2 size={16} />}
          color={palette.cacifos.fg}
          bgColor={palette.cacifos.bg}
        />
      </ContextualCard>
    </div>
  );
});

const FestaEmCursoRow = React.memo(function FestaEmCursoRow({ festa }: { festa: ReservaEmCurso }) {
  const inicio = new Date(festa.inicioEm);
  const horaInicio = inicio.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  const nomeSala = festa.local?.nome ?? "-";
  const aniversarianteNome = festa.aniversariantes?.[0]?.aniversariante?.nome ?? "-";

  // Find the next pending etapa (first one not concluded, ordered by ordem)
  // Etapas - oculto per pedido do cliente (12/07/2026). Mantém-se para retrocompatibilidade.
  // const proximaEtapa = festa.etapas?.find(e => !e.concluida);
  // const todasConcluidas = festa.etapas?.length > 0 && festa.etapas.every(e => e.concluida);

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
        {/* Etapas badge removido - substituído por estado simples */}
        <StatusBadge status="EM_CURSO">Em curso</StatusBadge>
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
  const nomeSala = festa.local?.nome ?? "-";
  const aniversarianteNome = festa.aniversariantes?.[0]?.aniversariante?.nome ?? "-";

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

import { METODO_PAGAMENTO_LABELS } from "@/lib/metodo-pagamento";

const METODO_LABELS: Record<string, string> = METODO_PAGAMENTO_LABELS;

const ReceitasDoDiaSection = React.memo(function ReceitasDoDiaSection() {
  const { data: kpis, isLoading } = useDashboardKPIs();
  const receitas = kpis?.receitasHoje ?? {};
  const metodos = Object.keys(receitas).filter((m) => receitas[m] > 0);
  const total = metodos.reduce((sum, m) => sum + receitas[m], 0);
  const fmtMoeda = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

  return (
    <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-poppins font-semibold text-[16px] text-text-primary">
          Receitas do Dia
        </h3>
        <span className="text-lg font-bold text-brand-600 tabular-nums">{fmtMoeda(total)}</span>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ) : metodos.length > 0 ? (
        <div className="space-y-2">
          {metodos.map((metodo) => (
            <div key={metodo} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <span className="text-sm text-text-secondary">{METODO_LABELS[metodo] ?? metodo}</span>
              <span className="text-sm font-semibold text-text-primary tabular-nums">{fmtMoeda(receitas[metodo])}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-text-muted">Sem receitas registadas hoje.</p>
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
      <div className="mt-4">
        <ReceitasDoDiaSection />
      </div>
      <div className="mt-4">
        <AniversariosProximosCard dias={30} />
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
