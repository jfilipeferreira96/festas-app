"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search, User, Users, Mail, Phone, Cake, Check, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import InputField from "@/components/form/input/InputField";
import { useSearchClientes } from "@/hooks/use-clientes";
import type { Cliente } from "@/lib/api/clientes";

/** Aniversariante simplificado devolvido pela pesquisa */
export interface ClienteFilho {
  id: string;
  nome: string;
  dataNascimento: string;
}

interface ClienteSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado quando o utilizador confirma a selecção. */
  onSelect: (cliente: Cliente, filhosSelecionados: ClienteFilho[]) => void;
}

/** Calcula idade a partir da data de nascimento (YYYY-MM-DD ou ISO). */
function calcIdade(dataNascimento: string): number {
  if (!dataNascimento) return 0;
  const nasc = new Date(dataNascimento);
  const agora = new Date();
  let idade = agora.getFullYear() - nasc.getFullYear();
  const m = agora.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && agora.getDate() < nasc.getDate())) idade--;
  return Math.max(0, idade);
}

export default function ClienteSearchModal({
  isOpen,
  onClose,
  onSelect,
}: ClienteSearchModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedFilhosIds, setSelectedFilhosIds] = useState<Set<string>>(new Set());
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus no input quando a modal abre
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Debounce 300ms para evitar spam de requests
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Limpa estado quando a modal fecha
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedCliente(null);
      setSelectedFilhosIds(new Set());
    }
  }, [isOpen]);

  const { data: searchResult, isLoading } = useSearchClientes(debouncedQuery);
  const clientes = useMemo(() => {
    // A API devolve { data: Cliente[] } via search; useSearchClientes retorna isso.
    const raw = searchResult as unknown;
    if (Array.isArray(raw)) return raw as Cliente[];
    if (raw && typeof raw === "object" && "data" in raw) {
      return (raw as { data: Cliente[] }).data;
    }
    return [];
  }, [searchResult]);

  const handleSelectCliente = useCallback((cliente: Cliente) => {
    setSelectedCliente(cliente);
    setSelectedFilhosIds(new Set()); // reset selecção de filhos
  }, []);

  const toggleFilho = useCallback((filhoId: string) => {
    setSelectedFilhosIds((prev) => {
      const next = new Set(prev);
      if (next.has(filhoId)) next.delete(filhoId);
      else next.add(filhoId);
      return next;
    });
  }, []);

  const handleConfirmar = useCallback(() => {
    if (!selectedCliente) return;
    const filhosSelecionados: ClienteFilho[] =
      selectedCliente.aniversariantes
        ?.filter((a) => selectedFilhosIds.has(a.id))
        .map((a) => ({
          id: a.id,
          nome: a.nome,
          dataNascimento: a.dataNascimento,
        })) ?? [];
    onSelect(selectedCliente, filhosSelecionados);
    onClose();
  }, [selectedCliente, selectedFilhosIds, onSelect, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Search size={18} className="text-brand-500" />
          Pesquisar Cliente Existente
        </h2>

        {/* Input de pesquisa */}
        <InputField
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar por nome, email, telefone ou NIF..."
        />

        {/* Estado: nada seleccionado → lista de resultados */}
        {!selectedCliente && (
          <div className="mt-4">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-text-muted">A pesquisar...</span>
              </div>
            )}

            {!isLoading && debouncedQuery.length > 0 && clientes.length === 0 && (
              <div className="text-center py-8">
                <Users size={32} className="mx-auto text-text-muted mb-2" />
                <p className="text-sm text-text-muted">Nenhum cliente encontrado.</p>
              </div>
            )}

            {!isLoading && debouncedQuery.length === 0 && (
              <div className="text-center py-8">
                <Search size={32} className="mx-auto text-text-muted mb-2" />
                <p className="text-sm text-text-muted">
                  Escreva para pesquisar clientes existentes.
                </p>
              </div>
            )}

            {!isLoading && clientes.length > 0 && (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {clientes.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => handleSelectCliente(cliente)}
                    className="w-full text-left p-3 rounded-lg border border-border bg-white hover:border-primary-300 hover:bg-primary-50/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <User size={14} className="text-brand-500 shrink-0" />
                          <span className="text-sm font-medium text-text-primary truncate">
                            {cliente.nome}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                          {cliente.telefone && (
                            <span className="flex items-center gap-1 text-xs text-text-muted">
                              <Phone size={11} /> {cliente.telefone}
                            </span>
                          )}
                          {cliente.email && (
                            <span className="flex items-center gap-1 text-xs text-text-muted truncate">
                              <Mail size={11} /> {cliente.email}
                            </span>
                          )}
                        </div>
                      </div>
                      {cliente.aniversariantes && cliente.aniversariantes.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full shrink-0">
                          <Cake size={11} />
                          {cliente.aniversariantes.length}{" "}
                          {cliente.aniversariantes.length === 1 ? "filho" : "filhos"}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Estado: cliente seleccionado → detalhe + selecção de filhos */}
        {selectedCliente && (
          <div className="mt-4 space-y-4">
            {/* Cartão do cliente seleccionado */}
            <div className="p-4 rounded-lg border border-primary-200 bg-primary-50/30">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-600">
                    <User size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      {selectedCliente.nome}
                    </p>
                    <p className="text-xs text-text-muted">
                      {selectedCliente.telefone}
                      {selectedCliente.email ? ` · ${selectedCliente.email}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCliente(null)}
                  className="p-1 text-text-muted hover:text-accent-red transition-colors"
                  title="Escolher outro"
                >
                  <X size={16} />
                </button>
              </div>
              {selectedCliente.contribuinte && (
                <p className="text-xs text-text-muted">NIF: {selectedCliente.contribuinte}</p>
              )}
              {selectedCliente.codigoPostal && (
                <p className="text-xs text-text-muted">
                  Código Postal: {selectedCliente.codigoPostal}
                </p>
              )}
            </div>

            {/* Selecção de filhos (aniversariantes) — opcional */}
            {selectedCliente.aniversariantes &&
              selectedCliente.aniversariantes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Cake size={14} className="text-pink-500" />
                      Filhos (aniversariantes)
                    </label>
                    <span className="text-[11px] text-text-muted">Opcional</span>
                  </div>
                  <p className="text-xs text-text-muted mb-2">
                    Seleccione os filhos a pré-preencher como crianças / aniversariantes.
                  </p>
                  <div className="space-y-1.5">
                    {selectedCliente.aniversariantes.map((filho) => {
                      const isSelected = selectedFilhosIds.has(filho.id);
                      return (
                        <button
                          key={filho.id}
                          type="button"
                          onClick={() => toggleFilho(filho.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                            isSelected
                              ? "border-primary-300 bg-primary-50/50"
                              : "border-border bg-white hover:border-gray-300"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
                              isSelected
                                ? "bg-primary-500 border-primary-500 text-white"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && <Check size={13} />}
                          </div>
                          <div className="flex-1 text-left">
                            <span className="text-sm text-text-primary">{filho.nome}</span>
                          </div>
                          {filho.dataNascimento && (
                            <span className="text-xs text-text-muted">
                              {calcIdade(filho.dataNascimento)} anos
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Sem filhos */}
            {(!selectedCliente.aniversariantes ||
              selectedCliente.aniversariantes.length === 0) && (
              <p className="text-xs text-text-muted italic">
                Este cliente não tem filhos registados. Pode continuar sem seleccionar.
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!selectedCliente}
            type="button"
            className="flex items-center gap-2"
          >
            <Check size={16} />
            Preencher Formulário
          </Button>
        </div>
      </div>
    </Modal>
  );
}