"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Sandwich, AlertTriangle, Cake, DoorOpen, Save, Pencil } from "lucide-react";
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

/** Row types — DataTable requires { id: string } */
type LancheFestaRow = LancheFesta & { id: string };
type LancheEntradaRow = LancheEntradaLivre & { id: string };

export default function LancheContent() {
  const [dataSel, setDataSel] = useState<string>(todayISO());
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
    <div>
      <PageHeader
        title="Lanches do Dia"
        subtitle={formatDataLabel(dataSel)}
        actions={
          <div className="flex items-center gap-2">
            <DatePicker
              id="lanche-date-picker"
              defaultDate={dataSel}
              onChange={([date]: Date[]) => {
                if (date) setDataSel(date.toISOString().split("T")[0]);
              }}
              className="w-44"
            />
          </div>
        }
      />

      {/* Alergias / Restrições */}
      {((alergias as unknown as { reservaId: string; nomeFesta: string; notasLanche: string }[]) ?? []).length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-warning-50 border border-warning-200">
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
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Cake size={16} className="text-brand-500" />
          Festas
        </h3>
        {isLoading ? (
          <p className="text-sm text-text-muted">A carregar...</p>
        ) : festas.length > 0 ? (
          <DataTable<LancheFestaRow>
            data={festas}
            columns={festasColumns}
            itemLabel="festas"
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
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                >
                  <Pencil size={15} />
                </button>
              </Tooltip>
            )}
          />
        ) : (
          <p className="text-sm text-text-muted">Sem festas para esta data.</p>
        )}
      </div>

      {/* Tabela de Entradas Livres — DataTable */}
      {entradas.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <DoorOpen size={16} className="text-brand-500" />
            Entradas Livres
          </h3>
          <DataTable<LancheEntradaRow>
            data={entradas}
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
