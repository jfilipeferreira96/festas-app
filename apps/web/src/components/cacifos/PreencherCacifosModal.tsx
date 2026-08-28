"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Package, Printer, Plus, Trash2, Bell, CheckCircle2,
  Loader2, AlertTriangle, RefreshCw,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import { useReserva } from "@/hooks/use-reservas";
import { useUpdateReserva } from "@/hooks/use-reservas";
import {
  useCacifos, useActualizarCacifo, useLibertar,
  useAdicionarCacifoReserva, useCacifosDisponiveis,
  useTrocarCacifo, useRealocarTodos,
} from "@/hooks/use-cacifos";
import { useActualizarEstadoCacifos } from "@/hooks/use-reservas";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/utils/date";
import { imprimirListaConvidados } from "@/utils/print-lista";
import { cacifosApi, type Cacifo } from "@/lib/api/cacifos";

// ── Props ──────────────────────────────────────────────────────────
interface PreencherCacifosModalProps {
  reservaId: string | null;
  onClose: () => void;
  /** Cacifo pré-seleccionado a adicionar automaticamente à reserva (vindo do grid de cacifos). */
  preselectedCacifoId?: string | null;
}

// ── Main Component ─────────────────────────────────────────────────
export default React.memo(function PreencherCacifosModal({
  reservaId,
  onClose,
  preselectedCacifoId,
}: PreencherCacifosModalProps) {
  const { data: reserva, isLoading } = useReserva(reservaId ?? "");
  const { data: cacifos } = useCacifos(reservaId ? { reservaId } : undefined);
  const { data: disponiveis } = useCacifosDisponiveis();

  const toast = useToast();
  const queryClient = useQueryClient();
  const actualizarEstado = useActualizarEstadoCacifos();
  const adicionarCacifo = useAdicionarCacifoReserva();
  const realocar = useRealocarTodos();

  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // ── Derived ──────────────────────────────────────────────────────
  const cacifosList = cacifos ?? [];

  // ── Auto-adicionar cacifo pré-seleccionado + focus no input ──
  const preselectedAddedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!reservaId || !preselectedCacifoId) return;
    if (preselectedAddedRef.current === preselectedCacifoId) return;

    const alreadyAssigned = cacifosList.some(c => c.id === preselectedCacifoId);
    if (!alreadyAssigned) {
      preselectedAddedRef.current = preselectedCacifoId;
      cacifosApi.marcarOcupado(preselectedCacifoId, reservaId)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["cacifos"] });
          setTimeout(() => {
            document.querySelector<HTMLInputElement>(`[data-cacifo-input="${preselectedCacifoId}"]`)?.focus();
          }, 400);
        })
        .catch(() => toast.error("Não foi possível adicionar o cacifo."));
    } else {
      preselectedAddedRef.current = preselectedCacifoId;
      setTimeout(() => {
        document.querySelector<HTMLInputElement>(`[data-cacifo-input="${preselectedCacifoId}"]`)?.focus();
      }, 100);
    }
  }, [reservaId, preselectedCacifoId, cacifosList, queryClient, toast]);

  // ── Trigger B: materializar pré-reserva quando a festa é HOJE ──
  // Os cacifos são um pool físico diário — só se reservam no dia da festa.
  const materializadoRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!reservaId || !reserva) return;
    if (materializadoRef.current === reservaId) return;

    const alvo = reserva.numCriancasConfirmadas || reserva.numCriancas || reserva.previsaoCriancas || 0;
    const atribuidos = (cacifos ?? []).length;
    if (alvo <= 0 || atribuidos >= alvo) return;

    // Só materializa no dia da festa — datas futuras reservam-se no dia.
    const hoje = new Date().toISOString().split("T")[0];
    if (!reserva.data.startsWith(hoje)) return;

    materializadoRef.current = reservaId;
    cacifosApi.preReservar(reservaId, alvo - atribuidos)
      .then((res) => {
        queryClient.invalidateQueries({ queryKey: ["cacifos"] });
        if (res.indisponiveis > 0) {
          toast.warning(
            `Pré-reservados ${res.reservados.length} de ${alvo - atribuidos} cacifos — pool livre insuficiente.`
          );
        }
      })
      .catch(() => toast.error("Não foi possível pré-reservar cacifos."));
  }, [reservaId, reserva, cacifos, queryClient, toast]);

  const preenchidos = cacifosList.filter(
    (c) => c.criancas && c.criancas !== "Por preencher"
  ).length;
  const total = cacifosList.length;

  // ── Handlers ─────────────────────────────────────────────────────
  const handleChamar = useCallback(
    (checked: boolean) => {
      if (!reservaId) return;
      actualizarEstado.mutate({ id: reservaId, chamado: checked });
    },
    [reservaId, actualizarEstado]
  );

  const handleConcluir = useCallback(
    (checked: boolean) => {
      if (!reservaId) return;
      if (checked) {
        toast.info("A libertar todos os cacifos da festa...");
      }
      actualizarEstado.mutate({ id: reservaId, concluido: checked });
    },
    [reservaId, actualizarEstado, toast]
  );

  const handleImprimir = useCallback(() => {
    if (!reserva) return;
    imprimirListaConvidados(reserva, cacifosList);
  }, [reserva, cacifosList]);

  const handleAdicionarAuto = useCallback(() => {
    if (!reservaId) return;
    adicionarCacifo.mutate(
      { reservaId },
      {
        onSuccess: () => toast.success("Cacifo adicionado."),
        onError: () => toast.error("Não há cacifos livres disponíveis."),
      }
    );
    setShowAddDropdown(false);
  }, [reservaId, adicionarCacifo, toast]);

  const handleRealocar = useCallback(() => {
    if (!reservaId) return;
    realocar.mutate(reservaId, {
      onSuccess: (res) => {
        if (res.trocados === 0) {
          toast.info("Não há cacifos livres suficientes para realocar.");
        } else if (res.trocados < res.total) {
          toast.info(`Realocados ${res.trocados} de ${res.total} cacifos.`);
        } else {
          toast.success(`Realocados todos os ${res.trocados} cacifos.`);
        }
      },
      onError: () => toast.error("Erro ao realocar cacifos."),
    });
  }, [reservaId, realocar, toast]);

  // ── Render ───────────────────────────────────────────────────────
  if (!reservaId) return null;

  return (
    <Modal isOpen={!!reservaId} onClose={onClose} size="lg" title="Preencher Cacifos">
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin text-brand-500" />
          </div>
        ) : reserva ? (
          <div className="space-y-5">
            {/* Header */}
            <ModalHeader reserva={reserva} />

            {/* Nota: cacifos reservam-se no dia da festa */}
            {isFutura(reserva) && (
              <div className="p-3 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-700">
                Os cacifos desta festa são pré-reservados automaticamente no dia {formatDate(reserva.data)}.
                Até lá, o pool de cacifos mantém-se livre para as festas do dia.
              </div>
            )}

            {/* Progresso */}
            <ProgressoBar preenchidos={preenchidos} total={total} />

            {/* Controlo da festa */}
            <ControloFesta
              chamado={reserva.cacifosChamado ?? false}
              concluido={reserva.cacifosConcluido ?? false}
              onChamar={handleChamar}
              onConcluir={handleConcluir}
              onImprimir={handleImprimir}
              isPending={actualizarEstado.isPending}
            />

            {/* Lista de cacifos */}
            <CacifosList cacifos={cacifosList} reservaId={reservaId} disponiveis={disponiveis ?? []} />

            {/* Acções: adicionar + realocar todos */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setShowAddDropdown((v) => !v)}
                className="flex items-center gap-2"
                disabled={adicionarCacifo.isPending}
              >
                <Plus size={16} />
                Adicionar cacifo
              </Button>
              {showAddDropdown && (
                <Button
                  variant="outline"
                  onClick={handleAdicionarAuto}
                  loading={adicionarCacifo.isPending}
                  className="flex items-center gap-2"
                >
                  <Package size={16} />
                  Próximo livre
                </Button>
              )}
              {(disponiveis?.length ?? 0) > 0 && cacifosList.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleRealocar}
                  loading={realocar.isPending}
                  className="flex items-center gap-2 ml-auto"
                  title="Atribui novos cacifos livres a todas as crianças"
                >
                  <RefreshCw size={16} />
                  Realocar todos
                </Button>
              )}
            </div>

            {/* Notas */}
            <NotasSection reservaId={reservaId} reserva={reserva} />

            {/* Footer */}
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <Button variant="outline" onClick={onClose} className="ml-auto">
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-text-muted py-8">Festa não encontrada.</div>
        )}
      </div>
    </Modal>
  );
});

// ── Header ─────────────────────────────────────────────────────────
/** True se a festa é para uma data futura (cacifos ainda não se reservam). */
function isFutura(reserva: NonNullable<ReturnType<typeof useReserva>["data"]>): boolean {
  const hoje = new Date().toISOString().split("T")[0];
  return reserva.data.slice(0, 10) > hoje;
}

function ModalHeader({ reserva }: { reserva: ReturnType<typeof useReserva>["data"] }) {
  if (!reserva) return null;
  const anvNomes = reserva.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") || "—";
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-border">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50">
        <Package size={24} className="text-brand-500" />
      </div>
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-text-primary">{anvNomes}</h2>
        <p className="text-sm text-text-muted">
          {formatDate(reserva.data)} · {reserva.horario} · {reserva.local?.nome ?? "—"}
        </p>
      </div>
    </div>
  );
}

// ── Progresso ──────────────────────────────────────────────────────
function ProgressoBar({ preenchidos, total }: { preenchidos: number; total: number }) {
  if (total === 0) return null;
  const pct = total > 0 ? Math.round((preenchidos / total) * 100) : 0;
  const allDone = preenchidos === total;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-muted">
            {preenchidos}/{total} cacifos preenchidos
          </span>
          <span className={`text-xs font-bold ${allDone ? "text-accent-green-600" : "text-brand-500"}`}>
            {pct}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${allDone ? "bg-accent-green-500" : "bg-brand-400"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {allDone && (
        <span className="flex items-center gap-1 text-xs font-medium text-accent-green-600">
          <CheckCircle2 size={14} />
          Completo
        </span>
      )}
    </div>
  );
}

// ── Controlo da Festa ──────────────────────────────────────────────
function ControloFesta({
  chamado,
  concluido,
  onChamar,
  onConcluir,
  onImprimir,
  isPending,
}: {
  chamado: boolean;
  concluido: boolean;
  onChamar: (v: boolean) => void;
  onConcluir: (v: boolean) => void;
  onImprimir: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Chamar */}
      <button
        onClick={() => onChamar(!chamado)}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
          chamado
            ? "border-accent-orange bg-accent-orange-50 text-accent-orange-700"
            : "border-border bg-white text-text-secondary hover:border-accent-orange-300"
        }`}
      >
        <Bell size={16} className={chamado ? "fill-accent-orange" : ""} />
        <span className="text-sm font-medium">{chamado ? "Chamado" : "Chamar"}</span>
      </button>

      {/* Concluído */}
      <button
        onClick={() => onConcluir(!concluido)}
        disabled={isPending}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
          concluido
            ? "border-accent-green-500 bg-accent-green-50 text-accent-green-700"
            : "border-border bg-white text-text-secondary hover:border-accent-green-300"
        }`}
      >
        <CheckCircle2 size={16} />
        <span className="text-sm font-medium">{concluido ? "Concluído" : "Concluir"}</span>
      </button>

      {concluido && (
        <span className="flex items-center gap-1 text-xs text-accent-green-600">
          <AlertTriangle size={12} />
          Cacifos libertados
        </span>
      )}

      {/* Imprimir */}
      <button
        onClick={onImprimir}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-white text-text-secondary hover:text-text-primary hover:bg-gray-50 transition-all ml-auto"
      >
        <Printer size={16} />
        <span className="text-sm font-medium">Imprimir Lista</span>
      </button>
    </div>
  );
}

// ── Lista de Cacifos ───────────────────────────────────────────────
function CacifosList({
  cacifos,
  reservaId,
  disponiveis,
}: {
  cacifos: Cacifo[];
  reservaId: string;
  disponiveis: Cacifo[];
}) {
  if (cacifos.length === 0) {
    return (
      <div className="py-6 text-center rounded-lg bg-gray-50">
        <Package size={28} className="mx-auto text-text-muted mb-2" />
        <p className="text-sm text-text-muted">Nenhum cacifo pré-reservado.</p>
        <p className="text-xs text-text-muted mt-1">
          Use "Adicionar cacifo" para reservar cacifos para esta festa.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Cacifos ({cacifos.length})
      </h4>
      {cacifos.map((cacifo) => (
        <CacifoRow
          key={cacifo.id}
          cacifo={cacifo}
          reservaId={reservaId}
          disponiveis={disponiveis}
        />
      ))}
    </div>
  );
}

// ── Cacifo Row ─────────────────────────────────────────────────────
function CacifoRow({
  cacifo,
  reservaId,
  disponiveis,
}: {
  cacifo: Cacifo;
  reservaId: string;
  disponiveis: Cacifo[];
}) {
  const actualizar = useActualizarCacifo();
  const libertar = useLibertar();
  const trocar = useTrocarCacifo();
  const [nome, setNome] = useState(cacifo.criancas ?? "");
  const isPlaceholder = !nome || nome === "Por preencher";

  const handleBlur = useCallback(() => {
    const trimmed = nome.trim();
    if (trimmed === (cacifo.criancas ?? "")) return;
    actualizar.mutate({
      id: cacifo.id,
      criancas: trimmed || "Por preencher",
    });
  }, [nome, cacifo.criancas, cacifo.id, actualizar]);

  const handleRemove = useCallback(() => {
    libertar.mutate(cacifo.id);
  }, [cacifo.id, libertar]);

  const handleTrocar = useCallback(
    (novoCacifoId: string) => {
      if (!novoCacifoId || novoCacifoId === cacifo.id) return;
      trocar.mutate(
        { reservaId, cacifoAtualId: cacifo.id, novoCacifoId },
        { onError: () => {} }
      );
    },
    [reservaId, cacifo.id, trocar]
  );

  // Opções do Select: cacifo actual + cacifos livres
  const opcoes = [
    { value: cacifo.id, label: `#${cacifo.numero}` },
    ...disponiveis.map((c) => ({ value: c.id, label: `#${c.numero}` })),
  ];

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-white hover:border-brand-200 transition-all">
      {/* Select número (trocar cacifo) */}
      <div className="w-24 shrink-0">
        <Select
          options={opcoes}
          value={cacifo.id}
          onChange={handleTrocar}
          className="!h-9 !text-sm !font-bold"
        />
      </div>

      {/* Input nome */}
      <input
        data-cacifo-input={cacifo.id}
        type="text"
        value={isPlaceholder ? "" : nome}
        placeholder="Por preencher"
        onChange={(e) => setNome(e.target.value)}
        onBlur={handleBlur}
        disabled={cacifo.estado === "LIVRE" || trocar.isPending}
        className={`flex-1 px-3 py-2 text-sm rounded-lg border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-200 ${
          isPlaceholder ? "italic text-text-muted" : "text-text-primary"
        } ${trocar.isPending ? "opacity-50" : ""}`}
      />

      {/* Remove */}
      <button
        onClick={handleRemove}
        disabled={libertar.isPending}
        className="p-2 rounded-lg text-text-muted hover:text-accent-red hover:bg-red-50 transition-colors shrink-0"
        title="Libertar cacifo"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// ── Notas ──────────────────────────────────────────────────────────
function NotasSection({
  reservaId,
  reserva,
}: {
  reservaId: string;
  reserva: NonNullable<ReturnType<typeof useReserva>["data"]>;
}) {
  const updateReserva = useUpdateReserva();
  const [notasCacifos, setNotasCacifos] = useState(reserva.notasCacifos ?? "");
  const [observacoesLesoes, setObservacoesLesoes] = useState(reserva.observacoesLesoes ?? "");

  const handleSaveNotas = useCallback(() => {
    updateReserva.mutate({
      id: reservaId,
      data: { notasCacifos, observacoesLesoes },
    });
  }, [reservaId, notasCacifos, observacoesLesoes, updateReserva]);

  return (
    <div className="space-y-3 p-4 rounded-lg bg-surface border border-border">
      <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Observações</h4>

      {/* Notas Cacifos */}
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">Observações Cacifo</label>
        <textarea
          value={notasCacifos}
          onChange={(e) => setNotasCacifos(e.target.value)}
          rows={2}
          placeholder="Notas sobre os cacifos desta festa..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
        />
      </div>

      {/* Observações Lesões */}
      <div>
        <label className="text-xs font-medium text-text-secondary mb-1 block">
          Observações Lesões / Alergias
        </label>
        <textarea
          value={observacoesLesoes}
          onChange={(e) => setObservacoesLesoes(e.target.value)}
          rows={2}
          placeholder="Lesões, alergias ou condições especiais..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-200 resize-none"
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleSaveNotas}
        loading={updateReserva.isPending}
        className="flex items-center gap-2"
      >
        Guardar observações
      </Button>
    </div>
  );
}

// impressão movida para @/utils/print-lista (partilhada com FestasContent)
