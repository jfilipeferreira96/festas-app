"use client";

import React, { useMemo } from "react";
import { User } from "lucide-react";

interface SeletorCriancasProps {
  /** Texto actual do campo "criancas" (nomes separados por vírgula). */
  value: string;
  /** Nomes disponíveis da festa (aniversariantes + confirmados). */
  opcoes: string[];
  /** Actualiza o texto local (input). */
  onChange: (value: string) => void;
  /** Grava o valor final (null = limpo). */
  onCommit: (value: string | null) => void;
  disabled?: boolean;
  /** Preserva o focus automático da pré-selecção de cacifo. */
  dataCacifoInput?: string;
}

/** Nomes contidos no texto (split por vírgula, trimmed). */
function nomesNoTexto(value: string): Set<string> {
  return new Set(
    value
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean)
  );
}

/**
 * Selecção de crianças para um cacifo: 1 nome OU várias (pills da festa)
 * + input livre para nomes manuais (ex.: irmãos não registados).
 * Gravação imediata ao clicar numa pill; input grava no blur (igual ao fluxo actual).
 */
export default function SeletorCriancas({
  value,
  opcoes,
  onChange,
  onCommit,
  disabled = false,
  dataCacifoInput,
}: SeletorCriancasProps) {
  const selecionados = useMemo(() => nomesNoTexto(value), [value]);

  const toggle = (nome: string) => {
    if (disabled) return;
    const atuais = nomesNoTexto(value);
    let novo: string;
    if (atuais.has(nome)) {
      novo = [...atuais].filter((n) => n !== nome).join(", ");
    } else {
      atuais.add(nome);
      novo = [...atuais].join(", ");
    }
    onChange(novo);
    onCommit(novo.trim() || null);
  };

  const isPlaceholder = !value || value === "Por preencher";

  return (
    <div className="flex-1 min-w-0 space-y-1.5">
      {opcoes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {opcoes.map((nome) => {
            const ativo = selecionados.has(nome);
            return (
              <button
                key={nome}
                type="button"
                onClick={() => toggle(nome)}
                disabled={disabled}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors ${
                  ativo
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-text-secondary border-border hover:border-brand-300 hover:text-brand-600"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                title={ativo ? "Remover do cacifo" : "Colocar neste cacifo"}
              >
                <User size={10} className="shrink-0" />
                <span className="max-w-[120px] truncate">{nome}</span>
              </button>
            );
          })}
        </div>
      )}
      <input
        data-cacifo-input={dataCacifoInput}
        type="text"
        value={isPlaceholder ? "" : value}
        placeholder="Por preencher"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const trimmed = value.trim();
          onCommit(trimmed || null);
        }}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm rounded-lg border-0 bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-200 ${
          isPlaceholder ? "italic text-text-muted" : "text-text-primary"
        } ${disabled ? "opacity-50" : ""}`}
      />
    </div>
  );
}
