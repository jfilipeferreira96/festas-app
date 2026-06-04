"use client";

import React, { useCallback, useState } from "react";
import { UserCheck, UserX, Check, X, Plus, Trash2, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useParticipantes, useAdicionarParticipante, useConfirmarPresenca, useMarcarTodosPresenca, useRemoverParticipante } from "@/hooks/use-participantes";
import type { Reserva } from "@/lib/api/reservas";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";

interface CheckInModalProps {
  reserva: Reserva;
  onClose: () => void;
}

export default React.memo(function CheckInModal({ reserva, onClose }: CheckInModalProps) {
  const { data: participantes, isLoading } = useParticipantes(reserva.id);
  const adicionarParticipante = useAdicionarParticipante(reserva.id);
  const confirmarPresenca = useConfirmarPresenca(reserva.id);
  const marcarTodos = useMarcarTodosPresenca(reserva.id);
  const removerParticipante = useRemoverParticipante(reserva.id);

  const [novoNome, setNovoNome] = useState("");

  const presentes = participantes?.filter((p) => p.presente).length ?? 0;
  const total = participantes?.length ?? 0;
  const previstos = reserva.numCriancas ?? reserva.previsaoCriancas ?? 0;
  const isBatchLoading = marcarTodos.isPending;

  const handleToggle = useCallback(
    (participanteId: string, currentState: boolean) => {
      confirmarPresenca.mutate({ participanteId, presenca: !currentState });
    },
    [confirmarPresenca]
  );

  const handleMarcarTodos = useCallback(() => {
    marcarTodos.mutate(true);
  }, [marcarTodos]);

  const handleDesmarcarTodos = useCallback(() => {
    marcarTodos.mutate(false);
  }, [marcarTodos]);

  const handleAdicionar = useCallback(() => {
    const nome = novoNome.trim();
    if (!nome) return;
    adicionarParticipante.mutate(
      { nome },
      { onSuccess: () => setNovoNome("") }
    );
  }, [novoNome, adicionarParticipante]);

  const handleRemover = useCallback(
    (participanteId: string) => {
      removerParticipante.mutate(participanteId);
    },
    [removerParticipante]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleAdicionar();
      }
    },
    [handleAdicionar]
  );

  return (
    <Modal isOpen onClose={onClose} size="md">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <UserCheck size={20} className="text-brand-500" />
              Check-in de Participantes
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              {reserva.aniversariantes?.map((a) => a.aniversariante.nome).join(", ") ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-text-primary">
              {presentes} <span className="text-sm font-normal text-text-muted">/ {total}</span>
            </p>
            <p className="text-xs text-text-muted">Presentes</p>
            {previstos > 0 && (
              <p className="text-[10px] text-text-muted mt-0.5">
                Previstos: {previstos}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-accent-green-400 rounded-full transition-all duration-300"
            style={{ width: total > 0 ? `${(presentes / total) * 100}%` : "0%" }}
          />
        </div>

        {/* Add participant input */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nome do participante..."
              className="h-11 w-full rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs transition focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 text-text-primary placeholder:text-text-muted"
            />
          </div>
          <button
            onClick={handleAdicionar}
            disabled={!novoNome.trim() || adicionarParticipante.isPending}
            className="flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adicionarParticipante.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Plus size={14} />
            )}
            Adicionar
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleMarcarTodos}
            disabled={isBatchLoading || total === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent-green-600 bg-accent-green-50 hover:bg-accent-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBatchLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Marcar todos
          </button>
          <button
            onClick={handleDesmarcarTodos}
            disabled={isBatchLoading || total === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-accent-red bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBatchLoading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Desmarcar todos
          </button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !participantes || participantes.length === 0 ? (
          <div className="text-center py-8">
            <UserX size={32} className="mx-auto text-text-muted mb-2" />
            <p className="text-sm text-text-muted">Nenhum participante registado.</p>
            <p className="text-xs text-text-muted mt-1">Use o campo acima para adicionar participantes.</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
            {participantes.map((p) => (
              <div
                key={p.id}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                  p.presente
                    ? "bg-accent-green-50 border border-accent-green-200"
                    : "bg-gray-50 border border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  onClick={() => handleToggle(p.id, p.presente)}
                  disabled={confirmarPresenca.isPending}
                  className="flex items-center gap-3 flex-1 text-left disabled:cursor-wait"
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      p.presente ? "bg-accent-green-400 text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {p.presente ? <Check size={14} /> : <span className="text-xs">{p.nome.charAt(0)}</span>}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${p.presente ? "text-accent-green-700" : "text-text-primary"}`}>
                      {p.nome}
                    </p>
                    {p.cacifo && (
                      <p className="text-[10px] text-text-muted">Cacifo #{p.cacifo.numero}</p>
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.presente
                        ? "bg-accent-green-100 text-accent-green-700"
                        : "bg-gray-100 text-text-muted"
                    }`}
                  >
                    {p.presente ? "Presente" : "Ausente"}
                  </span>
                  <Tooltip content="Remover participante" position="top" theme="dark">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemover(p.id);
                      }}
                      disabled={removerParticipante.isPending}
                      className="p-1 text-text-muted hover:text-accent-red transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <p className="text-xs text-text-muted">
            {total > 0 ? `${presentes} presentes de ${total} participantes` : "Sem participantes"}
            {previstos > 0 && total !== previstos ? ` (previstos: ${previstos})` : ""}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-3 text-sm font-medium rounded-[10px] bg-white text-gray-700 border border-gray-300 shadow-theme-xs hover:bg-gray-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
});