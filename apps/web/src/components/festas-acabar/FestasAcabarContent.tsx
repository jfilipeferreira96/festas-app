"use client";

import React, { useState, useCallback } from "react";
import { Save, Clock, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import TextArea from "@/components/form/input/TextArea";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { FestaColorDot } from "@/components/ui/FestaColorPicker";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { useFestasAcabar, useAtualizarFestaAcabar } from "@/hooks/use-festas-acabar";
import type { FestaAcabar } from "@/lib/api/festasAcabar";

interface EditState {
  festa: FestaAcabar;
  brindes: string;
  brindesPais: string;
  lesoes: string;
}

export default function FestasAcabarContent() {
  const { data: festasRaw, isLoading } = useFestasAcabar();
  const atualizar = useAtualizarFestaAcabar();
  const [editing, setEditing] = useState<EditState | null>(null);

  const festas = (festasRaw as unknown as FestaAcabar[]) ?? [];

  const handleEdit = useCallback((festa: FestaAcabar) => {
    setEditing({
      festa,
      brindes: festa.observacoesBrindes ?? "",
      brindesPais: festa.observacoesBrindesPais ?? "",
      lesoes: festa.observacoesLesoes ?? "",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    await atualizar.mutateAsync({
      reservaId: editing.festa.id,
      data: {
        observacoesBrindes: editing.brindes,
        observacoesBrindesPais: editing.brindesPais,
        observacoesLesoes: editing.lesoes,
      },
    });
    setEditing(null);
  }, [editing, atualizar]);

  const columns: Column<FestaAcabar>[] = [
    {
      key: "fimPrevisto",
      label: "Hora Saída",
      sortable: true,
      render: (_v, f) => (
        <span className="font-medium text-text-primary whitespace-nowrap flex items-center gap-1">
          <Clock size={13} className="text-text-muted" />
          {f.fimPrevisto ? format(parseISO(f.fimPrevisto), "HH:mm") : "—"}
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
      key: "localNome",
      label: "Sala",
      render: (_v, f) => (
        <span className="text-sm text-text-secondary">{f.localNome || "—"}</span>
      ),
    },
    {
      key: "numCriancas",
      label: "Crianças",
      sortable: true,
      render: (_v, f) => (
        <span className="text-sm text-text-secondary text-center block">{f.numCriancas}</span>
      ),
    },
    {
      key: "observacoesBrindes",
      label: "Brindes",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block max-w-[160px] truncate">
          {f.observacoesBrindes || "—"}
        </span>
      ),
    },
    {
      key: "observacoesBrindesPais",
      label: "Brindes dos Pais",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block max-w-[160px] truncate">
          {f.observacoesBrindesPais || "—"}
        </span>
      ),
    },
    {
      key: "observacoesLesoes",
      label: "Obs. Lesões",
      render: (_v, f) => (
        <span className="text-xs text-text-secondary block max-w-[160px] truncate">
          {f.observacoesLesoes || "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Festas a Acabar"
        subtitle="Festas em curso ordenadas por hora de saída"
      />

      <DataTable<FestaAcabar>
        data={festas}
        columns={columns}
        itemLabel="festas em curso"
        loading={isLoading}
        defaultSort={{ key: "fimPrevisto", direction: "asc" }}
        searchable
        searchPlaceholder="Pesquisar por aniversariante, sala..."
        searchFn={(f, q) =>
          (f.nomeFesta ?? "").toLowerCase().includes(q) ||
          (f.localNome ?? "").toLowerCase().includes(q)
        }
        pagination
        pageSize={10}
        renderActions={(f) => (
          <div className="flex items-center justify-end gap-1">
            <Tooltip content="Editar observações" position="top" theme="dark">
              <button
                onClick={() => handleEdit(f)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
              >
                <Pencil size={15} />
              </button>
            </Tooltip>
          </div>
        )}
        emptyState={{
          title: "Sem festas em curso",
          description: "Não há festas a decorrer neste momento.",
        }}
      />

      {/* Modal de edição */}
      {editing && (
        <Modal isOpen={!!editing} onClose={() => setEditing(null)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-1">Observações</h2>
            <p className="text-sm text-text-muted mb-4">{editing.festa.nomeFesta}</p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Brindes
                </label>
                <TextArea
                  placeholder="Brindes da festa..."
                  value={editing.brindes}
                  onChange={(v) => setEditing({ ...editing, brindes: v })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Brindes dos Pais
                </label>
                <TextArea
                  placeholder="Brindes oferecidos pelos pais..."
                  value={editing.brindesPais}
                  onChange={(v) => setEditing({ ...editing, brindesPais: v })}
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-primary mb-1.5 block">
                  Observações de Lesões
                </label>
                <TextArea
                  placeholder="Lesões, condições especiais..."
                  value={editing.lesoes}
                  onChange={(v) => setEditing({ ...editing, lesoes: v })}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={atualizar.isPending}
                className="flex items-center gap-2"
              >
                <Save size={16} />
                {atualizar.isPending ? "A guardar..." : "Guardar"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
