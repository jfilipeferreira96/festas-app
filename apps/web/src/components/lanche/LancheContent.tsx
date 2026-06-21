"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Sandwich, AlertTriangle, Cake, DoorOpen, Save } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { PageHeader, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import InputField from "@/components/form/input/InputField";
import TextArea from "@/components/form/input/TextArea";
import { Select } from "@/components/ui/select";
import {
  useLanchesDoDia,
  useAlergias,
  useAtualizarNotasLanche,
  useAtualizarEstadoLanche,
  useAtualizarEstadoLancheEntrada,
} from "@/hooks/use-lanche";
import type { LancheDoDia, LancheFesta, LancheEntradaLivre, EstadoLanche } from "@saas/shared-types";

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

const ESTADO_LABELS: Record<EstadoLanche, string> = {
  NAO_INICIADO: "Não iniciado",
  A_DECORRER: "A decorrer",
  TERMINADO: "Terminado",
};


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
    const f: LancheFesta[] = [];
    const e: LancheEntradaLivre[] = [];
    for (const item of (lanches as unknown as LancheDoDia[]) ?? []) {
      if (item.tipo === "FESTA") f.push(item);
      else e.push(item);
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

  return (
    <div>
      <PageHeader
        title="Lanches do Dia"
        subtitle={formatDataLabel(dataSel)}
        actions={
          <div className="flex items-center gap-2">
            <InputField
              type="date"
              value={dataSel}
              onChange={(e) => setDataSel(e.target.value)}
              className="w-auto"
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

      {/* Tabela de Festas */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Cake size={16} className="text-brand-500" />
          Festas
        </h3>
        {isLoading ? (
          <p className="text-sm text-text-muted">A carregar...</p>
        ) : festas.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Hora Lanche</th>
                  <th className="px-3 py-2.5">Cor</th>
                  <th className="px-3 py-2.5">Aniversariante</th>
                  <th className="px-3 py-2.5 text-center">Confirm.</th>
                  <th className="px-3 py-2.5 text-center">Total</th>
                  <th className="px-3 py-2.5">Menu</th>
                  <th className="px-3 py-2.5">Extras</th>
                  <th className="px-3 py-2.5">Obs. Lanche/Cacifo</th>
                  <th className="px-3 py-2.5 text-center">Idade</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {festas.map((f) => (
                  <tr key={f.reservaId} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-text-primary whitespace-nowrap">
                      {f.horaLanche ?? f.horario ?? "—"}
                    </td>
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
                    <td className="px-3 py-2.5 text-text-primary">{f.nomeFesta}</td>
                    <td className="px-3 py-2.5 text-center text-text-secondary">
                      {f.numConfirmados ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-text-secondary">
                      {f.numCriancas || f.previsaoCriancas || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">
                      {f.menu?.nome ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">
                      {f.extrasNomes?.length ? f.extrasNomes.join(", ") : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs max-w-[180px] truncate">
                      {[f.notasLanche, f.observacoesCacifo].filter(Boolean).join(" / ") || "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center text-text-secondary">
                      {f.idadeAniversariante != null ? `${f.idadeAniversariante}a` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={f.estadoLanche}
                        options={[
                          { value: "NAO_INICIADO", label: "Não iniciado" },
                          { value: "A_DECORRER", label: "A decorrer" },
                          { value: "TERMINADO", label: "Terminado" },
                        ]}
                        onChange={(opt) => handleEstadoChange(f.reservaId, opt)}
                        className="w-36 text-xs"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditNotas(f)}
                        className="whitespace-nowrap"
                      >
                        Notas
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Sem festas para esta data.</p>
        )}
      </div>

      {/* Tabela de Entradas Livres */}
      {entradas.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <DoorOpen size={16} className="text-brand-500" />
            Entradas Livres
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
                  <th className="px-3 py-2.5">Hora Lanche</th>
                  <th className="px-3 py-2.5">Encarregado</th>
                  <th className="px-3 py-2.5">Local</th>
                  <th className="px-3 py-2.5 text-center">Nº Crianças</th>
                  <th className="px-3 py-2.5">Obs. Lesões</th>
                  <th className="px-3 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entradas.map((e) => (
                  <tr key={e.entradaLivreId} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-text-primary whitespace-nowrap">
                      {e.horaLanche ?? (e.inicioEm ? format(parseISO(e.inicioEm), "HH:mm") : "—")}
                    </td>
                    <td className="px-3 py-2.5 text-text-primary">{e.encarregadoNome}</td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs">{e.localNome}</td>
                    <td className="px-3 py-2.5 text-center text-text-secondary">
                      {e.criancas?.length ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary text-xs max-w-[180px] truncate">
                      {e.observacoesLesoes || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <Select
                        value={e.estadoLanche}
                        options={[
                          { value: "NAO_INICIADO", label: "Não iniciado" },
                          { value: "A_DECORRER", label: "A decorrer" },
                          { value: "TERMINADO", label: "Terminado" },
                        ]}
                        onChange={(opt) => handleEstadoEntradaChange(e.entradaLivreId, opt)}
                        className="w-36 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
