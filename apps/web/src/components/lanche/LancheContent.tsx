"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Sandwich, AlertTriangle, Save, Pencil, Printer, Clock, CookingPot, CheckCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import DatePicker from "@/components/form/date-picker";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import {
  useLanchesDoDia,
  useAlergias,
  useAtualizarNotasLanche,
  useAtualizarEstadoLanche,
  useAtualizarEstadoLancheEntrada,
} from "@/hooks/use-lanche";
import type { LancheDoDia, LancheFesta, LancheEntradaLivre } from "@saas/shared-types";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDataLabel(data: string): string {
  try {
    return format(parseISO(data), "EEEE, d 'de' MMMM", { locale: pt });
  } catch {
    return data;
  }
}

const ESTADO_LANCHE_OPTIONS = [
  { value: "NAO_INICIADO", label: "Não iniciado" },
  { value: "A_DECORRER", label: "A decorrer" },
  { value: "TERMINADO", label: "Terminado" },
];

/** Opções do filtro por estado lanche (aplicado a Festas + Entradas Livres). */
const FILTRO_OPTIONS = [
  { value: "TODOS", label: "Todos" },
  { value: "NAO_INICIADO", label: "Por preparar" },
  { value: "A_DECORRER", label: "A decorrer" },
  { value: "TERMINADO", label: "Terminado" },
] as const;

type FiltroEstado = (typeof FILTRO_OPTIONS)[number]["value"];

/** Row types — DataTable requires { id: string } */
type LancheFestaRow = LancheFesta & { id: string };
type LancheEntradaRow = LancheEntradaLivre & { id: string };

export default function LancheContent() {
  const [dataSel, setDataSel] = useState<string>(todayISO());
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODOS");
  const [editingFesta, setEditingFesta] = useState<LancheFesta | null>(null);
  const [notasEdit, setNotasEdit] = useState("");
  const [lesoesEdit, setLesoesEdit] = useState("");
  const [horaLancheEdit, setHoraLancheEdit] = useState<string>("");

  const { data: lanches, isLoading } = useLanchesDoDia(dataSel);
  const { data: alergias } = useAlergias(dataSel);
  const atualizarNotas = useAtualizarNotasLanche();
  const atualizarEstado = useAtualizarEstadoLanche();
  const atualizarEstadoEntrada = useAtualizarEstadoLancheEntrada();

  const { festas, entradas } = useMemo(() => {
    const f: LancheFestaRow[] = [];
    const e: LancheEntradaRow[] = [];
    for (const item of (lanches as unknown as LancheDoDia[]) ?? []) {
      if (item.tipo === "FESTA") f.push({ ...item, id: item.reservaId });
      else e.push({ ...item, id: item.entradaLivreId });
    }
    f.sort((a, b) => (a.horaLanche ?? a.horario ?? "").localeCompare(b.horaLanche ?? b.horario ?? ""));
    e.sort((a, b) => (a.horaLanche ?? a.inicioEm ?? "").localeCompare(b.horaLanche ?? b.inicioEm ?? ""));
    return { festas: f, entradas: e };
  }, [lanches]);

  // ── Contadores de estado (Festas + Entradas Livres) ───────────────
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      NAO_INICIADO: 0,
      A_DECORRER: 0,
      TERMINADO: 0,
    };
    for (const f of festas) c[f.estadoLanche] = (c[f.estadoLanche] ?? 0) + 1;
    for (const e of entradas) c[e.estadoLanche] = (c[e.estadoLanche] ?? 0) + 1;
    return c;
  }, [festas, entradas]);

  // ── Listas filtradas por estado lanche ────────────────────────────
  const { filteredFestas, filteredEntradas } = useMemo(() => {
    if (filtroEstado === "TODOS") return { filteredFestas: festas, filteredEntradas: entradas };
    return {
      filteredFestas: festas.filter((f) => f.estadoLanche === filtroEstado),
      filteredEntradas: entradas.filter((e) => e.estadoLanche === filtroEstado),
    };
  }, [festas, entradas, filtroEstado]);

  const handleEditNotas = useCallback((festa: LancheFesta) => {
    setEditingFesta(festa);
    setNotasEdit(festa.notasLanche ?? "");
    setLesoesEdit(festa.observacoesLesoes ?? "");
    setHoraLancheEdit(festa.horaLanche ?? "");
  }, []);

  const handleSaveNotas = useCallback(async () => {
    if (!editingFesta) return;
    await atualizarNotas.mutateAsync({
      reservaId: editingFesta.reservaId,
      data: {
        notasLanche: notasEdit,
        observacoesLesoes: lesoesEdit,
        horaLanche: horaLancheEdit || null,
      },
    });
    setEditingFesta(null);
  }, [editingFesta, notasEdit, lesoesEdit, horaLancheEdit, atualizarNotas]);

  const handleEstadoChange = useCallback(
    (reservaId: string, estado: string) => {
      atualizarEstado.mutate({ reservaId, estado });
    },
    [atualizarEstado]
  );

  const handleEstadoEntradaChange = useCallback(
    (entradaLivreId: string, estado: string) => {
      atualizarEstadoEntrada.mutate({ entradaLivreId, estado });
    },
    [atualizarEstadoEntrada]
  );

  // ── Columns: Festas (mesmo padrão visual do FestasTabela) ──────────
  const festasColumns: Column<LancheFestaRow>[] = useMemo(() => [
    {
      key: "horaLanche",
      label: "Hora Lanche",
      sortable: true,
      render: (_v, f) => (
        <span className="font-medium text-text-primary whitespace-nowrap">
          {f.horaLanche ?? f.horario ?? "—"}
        </span>
      ),
    },
    {
      key: "nomeFesta",
      label: "Aniversariante",
      sortable: true,
      render: (_v, f) => (
        <div className="flex items-center gap-2">
          <FestaColorDot color={f.cor} />
          <div>
            <p className="text-sm font-medium text-text-primary">{f.nomeFesta}</p>
            {f.idadeAniversariante != null && (
              <p className="text-xs text-primary-500 font-medium">{f.idadeAniversariante} anos</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "numConfirmados",
      label: "Confirm.",
      sortable: true,
      render: (_v, f) => (
        <span className="text-sm text-text-secondary block text-center">
          {f.numConfirmados ?? "—"}
        </span>
      ),
    },
    {
      key: "numCriancas",
      label: "Total",
      sortable: true,
      render: (_v, f) => (
        <span className="text-sm text-text-secondary block text-center">
          {f.numCriancas || f.previsaoCriancas || "—"}
        </span>
      ),
    },
    {
      key: "menu",
      label: "Menu",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary">{f.menu?.nome ?? "—"}</span>
      ),
    },
    {
      key: "extrasNomes",
      label: "Extras",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary">
          {f.extrasNomes?.length ? f.extrasNomes.join(", ") : "—"}
        </span>
      ),
    },
    {
      key: "notasLanche",
      label: "Obs. Lanche",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block max-w-[160px] truncate" title={f.notasLanche ?? ""}>
          {f.notasLanche || "—"}
        </span>
      ),
    },
    {
      key: "observacoesCacifo",
      label: "Obs. Cacifo",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block max-w-[160px] truncate" title={f.observacoesCacifo ?? ""}>
          {f.observacoesCacifo || "—"}
        </span>
      ),
    },
    {
      key: "observacoesLesoes",
      label: "Obs. Lesões",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block max-w-[160px] truncate" title={f.observacoesLesoes ?? ""}>
          {f.observacoesLesoes || "—"}
        </span>
      ),
    },
    {
      key: "estadoLanche",
      label: "Estado",
      render: (_v, f) => (
        <Select
          value={f.estadoLanche}
          options={ESTADO_LANCHE_OPTIONS}
          onChange={(opt) => handleEstadoChange(f.reservaId, opt)}
          className="w-36 text-xs"
        />
      ),
    },
  ], [handleEstadoChange]);

  // ── Columns: Entradas Livres ───────────────────────────────────────
  const entradasColumns: Column<LancheEntradaRow>[] = useMemo(() => [
    {
      key: "horaLanche",
      label: "Hora Lanche",
      sortable: true,
      render: (_v, e) => (
        <span className="font-medium text-text-primary whitespace-nowrap">
          {e.horaLanche ?? (e.inicioEm ? format(parseISO(e.inicioEm), "HH:mm") : "—")}
        </span>
      ),
    },
    {
      key: "encarregadoNome",
      label: "Encarregado",
      sortable: true,
      render: (_v, e) => (
        <span className="text-sm font-medium text-text-primary">{e.encarregadoNome}</span>
      ),
    },
    {
      key: "localNome",
      label: "Local",
      render: (_v, e) => (
        <span className="text-xs text-text-secondary">{e.localNome}</span>
      ),
    },
    {
      key: "criancas",
      label: "Nº Crianças",
      sortable: true,
      render: (_v, e) => (
        <span className="text-sm text-text-secondary block text-center">
          {e.criancas?.length ?? 0}
        </span>
      ),
    },
    {
      key: "observacoesLesoes",
      label: "Obs. Lesões",
      render: (_v, e) => (
        <span className="text-xs text-text-secondary block max-w-[180px] truncate" title={e.observacoesLesoes ?? ""}>
          {e.observacoesLesoes || "—"}
        </span>
      ),
    },
    {
      key: "estadoLanche",
      label: "Estado",
      render: (_v, e) => (
        <Select
          value={e.estadoLanche}
          options={ESTADO_LANCHE_OPTIONS}
          onChange={(opt) => handleEstadoEntradaChange(e.entradaLivreId, opt)}
          className="w-36 text-xs"
        />
      ),
    },
  ], [handleEstadoEntradaChange]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lanches do Dia"
        subtitle={formatDataLabel(dataSel)}
      />

      {/* Resumo de estados — cards compactos (estilo cacifos) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-orange-50">
            <Clock size={20} className="text-accent-orange-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Por preparar</p>
            <p className="text-lg font-bold text-accent-orange-600">{counts.NAO_INICIADO}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50">
            <CookingPot size={20} className="text-brand-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">A decorrer</p>
            <p className="text-lg font-bold text-brand-600">{counts.A_DECORRER}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent-green-50">
            <CheckCheck size={20} className="text-accent-green-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Terminados</p>
            <p className="text-lg font-bold text-accent-green-600">{counts.TERMINADO}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-border shadow-theme-xs">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-50">
            <Sandwich size={20} className="text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-text-muted">Total</p>
            <p className="text-lg font-bold text-text-primary">{festas.length + entradas.length}</p>
          </div>
        </div>
      </div>

      {/* Card de Filtros (estilo cacifos) */}
      <div className="p-4 rounded-xl bg-white border border-border shadow-theme-xs no-print">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <DatePicker
              id="lanche-date-picker"
              defaultDate={dataSel}
              onChange={([date]: Date[]) => {
                if (date) setDataSel(date.toISOString().split("T")[0]);
              }}
              className="w-44"
            />
            <div className="flex items-center gap-1 rounded-xl bg-gray-50 p-1">
              {FILTRO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFiltroEstado(opt.value)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
                    filtroEstado === opt.value
                      ? "bg-white text-brand-600 shadow-theme-sm"
                      : "text-gray-500 hover:text-gray-700 hover:bg-white/60"
                  }`}
                >
                  {opt.label}
                  {opt.value !== "TODOS" && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        filtroEstado === opt.value
                          ? "bg-brand-100 text-brand-700"
                          : "bg-gray-100 text-text-muted"
                      }`}
                    >
                      {counts[opt.value] ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-theme-xs"
          >
            <Printer size={16} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Alergias / Restrições */}
      {((alergias as unknown as { reservaId: string; nomeFesta: string; notasLanche: string }[]) ?? []).length > 0 && (
        <div className="p-4 rounded-xl bg-warning-50 border border-warning-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-warning-600" />
            <h3 className="text-sm font-semibold text-warning-800">Alergias e Restrições</h3>
          </div>
          <ul className="space-y-1.5">
            {(alergias as unknown as { reservaId: string; nomeFesta: string; notasLanche: string }[]).map((a) => (
              <li key={a.reservaId} className="flex items-start gap-2 text-sm text-warning-900">
                <span className="font-medium">{a.nomeFesta}:</span>
                <span>{a.notasLanche || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabela de Festas — DataTable (mesmo padrão do FestasTabela) */}
      <div className="mt-6">
        {filteredFestas.length > 0 || isLoading ? (
          <DataTable<LancheFestaRow>
            data={filteredFestas}
            columns={festasColumns}
            itemLabel="festas"
            loading={isLoading}
            defaultSort={{ key: "horaLanche", direction: "asc" }}
            searchable
            searchPlaceholder="Pesquisar por aniversariante..."
            searchFn={(f, q) => (f.nomeFesta ?? "").toLowerCase().includes(q)}
            pagination
            pageSize={10}
            renderActions={(f) => (
              <Tooltip content="Editar observações" position="top" theme="dark">
                <button
                  onClick={() => handleEditNotas(f)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors no-print"
                >
                  <Pencil size={15} />
                </button>
              </Tooltip>
            )}
          />
        ) : entradas.length > 0 ? (
          <p className="text-sm text-text-muted">
            {filtroEstado !== "TODOS"
              ? "Sem festas com este estado."
              : "Sem festas para esta data."}
          </p>
        ) : null}
      </div>

      {/* Tabela de Entradas Livres — DataTable */}
      {filteredEntradas.length > 0 && (
        <div className="mt-6">
          <DataTable<LancheEntradaRow>
            data={filteredEntradas}
            columns={entradasColumns}
            itemLabel="entradas livres"
            defaultSort={{ key: "horaLanche", direction: "asc" }}
            searchable
            searchPlaceholder="Pesquisar por encarregado..."
            searchFn={(e, q) => (e.encarregadoNome ?? "").toLowerCase().includes(q)}
            pagination
            pageSize={10}
          />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && festas.length === 0 && entradas.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
            <Sandwich size={28} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">Sem lanches para esta data</p>
          <p className="text-xs text-text-muted mt-1">
            Não há festas nem entradas livres planeadas.
          </p>
        </div>
      )}

      {/* Modal de edição de notas + lesões */}
      {editingFesta && (
        <Modal isOpen={!!editingFesta} onClose={() => setEditingFesta(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Observações</h2>
            <p className="text-sm text-text-muted mb-4">{editingFesta.nomeFesta}</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Observações de Lanche
                </label>
                <TextArea
                  placeholder="Alergias, restrições, pedidos especiais..."
                  value={notasEdit}
                  onChange={(v) => setNotasEdit(v)}
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Hora do Lanche
                </label>
                <InputField
                  type="time"
                  value={horaLancheEdit}
                  onChange={(e) => setHoraLancheEdit(e.target.value)}
                  className="w-40"
                />
                <p className="text-xs text-text-muted mt-1">
                  Define a hora a que o lanche deve ser servido (opcional).
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Observações de Lesões
                </label>
                <TextArea
                  placeholder="Lesões, condições físicas, atenções especiais..."
                  value={lesoesEdit}
                  onChange={(v) => setLesoesEdit(v)}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button variant="outline" onClick={() => setEditingFesta(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveNotas}
                disabled={atualizarNotas.isPending}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {atualizarNotas.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
