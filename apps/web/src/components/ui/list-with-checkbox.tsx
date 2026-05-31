"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ListItem {
  id: string;
  title: string;
  description?: string;
  metadata?: React.ReactNode;
}

interface ListWithCheckboxProps {
  items: ListItem[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isAllSelected?: boolean;
  isIndeterminate?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  className?: string;
}

export default function ListWithCheckbox({
  items,
  selectedIds,
  onSelect,
  onSelectAll,
  onDeselectAll,
  isAllSelected = false,
  isIndeterminate = false,
  loading = false,
  emptyMessage = "Nenhum item encontrado",
  emptyDescription = "Não há itens para exibir no momento.",
  className,
}: ListWithCheckboxProps) {
  const handleSelectAll = () => {
    if (isAllSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-2">{emptyMessage}</div>
        <p className="text-sm text-gray-400">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Select All Header */}
      {items.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) {
                  el.indeterminate = isIndeterminate;
                }
              }}
              onChange={handleSelectAll}
              className="h-4 w-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
            />
            <span className="ml-3 text-sm text-gray-700">
              {isAllSelected 
                ? `Todos selecionados (${items.length})`
                : `${selectedIds.length} de ${items.length} selecionados`
              }
            </span>
          </div>
          <div className="space-x-2">
            <button
              onClick={onSelectAll}
              className="text-sm text-brand-600 hover:text-brand-700"
              disabled={loading}
            >
              Selecionar Todos
            </button>
            <button
              onClick={onDeselectAll}
              className="text-sm text-gray-600 hover:text-gray-700"
              disabled={loading}
            >
              Desmarcar Todos
            </button>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => onSelect(item.id)}
              className="h-4 w-4 text-brand-600 border-gray-300 rounded focus:ring-brand-500"
            />
            <div className="ml-3 flex-1">
              <div className="font-medium text-gray-900">
                {item.title}
              </div>
              {item.description && (
                <div className="text-sm text-gray-500 mt-1">
                  {item.description}
                </div>
              )}
              {item.metadata && (
                <div className="mt-2">
                  {item.metadata}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
