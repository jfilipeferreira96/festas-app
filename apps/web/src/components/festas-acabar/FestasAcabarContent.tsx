"use client";

import React, { useState, useCallback } from "react";
import { Save, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import TextArea from "@/components/form/input/TextArea";
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

  return (
    <div>
      <PageHeader
        title="Festas a Acabar"
        subtitle="Festas em curso ordenadas por hora de saída"
      />

      {isLoading ? (
        <p className="text-sm text-text-muted mt-4">A carregar...</p>
      ) : festas.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                <th className="px-3 py-2.5">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> Hora Saída
                  </span>
                </th>
                <th className="px-3 py-2.5">Aniversariante</th>
                <th className="px-3 py-2.5">Cor</th>
                <th className="px-3 py-2.5 text-center">Total Crianças</th>
                <th className="px-3 py-2.5">Brindes</th>
                <th className="px-3 py-2.5">Brindes dos Pais</th>
                <th className="px-3 py-2.5">Obs. Lesões</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {festas.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-text-primary whitespace-nowrap">
                    {f.fimPrevisto
                      ? format(parseISO(f.fimPrevisto), "HH:mm")
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-text-primary">{f.nomeFesta}</td>
                  <td className="px-3 py-2.5">
                    {f.cor ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${f.cor}20`, color: f.cor }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.cor }} />
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-secondary">{f.numCriancas}</td>
                  <td className="px-3 py-2.5 text-text-secondary text-xs max-w-[150px] truncate">
                    {f.observacoesBrindes || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-xs max-w-[150px] truncate">
                    {f.observacoesBrindesPais || "—"}
                  </td>
                  <td className="px-3 py-2.5 text-text-secondary text-xs max-w-[150px] truncate">
                    {f.observacoesLesoes || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(f)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-surface border border-border flex items-center justify-center mb-4">
            <Clock size={28} className="text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">Sem festas em curso</p>
          <p className="text-xs text-text-muted mt-1">
            Não há festas a decorrer neste momento.
          </p>
        </div>
      )}

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
