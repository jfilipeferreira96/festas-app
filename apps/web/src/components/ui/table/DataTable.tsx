"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Search, Pencil, Trash2, Plus, Eye } from "lucide-react";
import LoadingState from "../LoadingState";
import { Select } from "@/components/ui/select";
import Input from "@/components/ui/input";
import TablePagination from "../pagination/TablePagination";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "./index";
import { Tooltip } from "../tooltip/Tooltip";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchableFields?: (keyof T | string)[];
  /** Custom search function. Overrides searchableFields. */
  searchFn?: (item: T, query: string) => boolean;
  pagination?: boolean;
  pageSize?: number;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  /** Custom actions renderer for each row. Overrides default edit/delete/view buttons. */
  renderActions?: (item: T) => React.ReactNode;
  emptyState?: {
    title: string;
    description: string;
    action?: React.ReactNode;
  };
  canManage?: boolean;
  /** Plural label for items (e.g. "utilizadores", "reservas"). Defaults to "itens". */
  itemLabel?: string;
  /** Default sort configuration applied on mount */
  defaultSort?: {
    key: string;
    direction: "asc" | "desc";
  };
  /** Custom accessor for the sort value (overrides direct key access).
   *  Use to sort by a composite key (e.g. date+time). */
  sortAccessor?: (item: T) => string | number;
}

const PAGINATION_OPTIONS = [10, 25, 50, 100];

function getNestedValue<T>(obj: T, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function DataTable<T extends { id: string }>({
  data,
  columns,
  loading = false,
  searchable = true,
  searchPlaceholder = "Pesquisar...",
  searchableFields = [],
  searchFn,
  pagination = true,
  pageSize: initialPageSize = 10,
  onEdit,
  onDelete,
  onView,
  renderActions,
  emptyState,
  canManage = true,
  itemLabel = "itens",
  defaultSort,
  sortAccessor,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  } | null>(defaultSort ?? null);

  // Filter data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    if (searchFn) {
      return data.filter((item) => searchFn(item, query));
    }
    return data.filter((item) =>
      searchableFields.some((field) => {
        const value = getNestedValue(item, String(field));
        return value && String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, searchableFields, searchFn]);

  // Sort data
  const sortedData = useMemo(() => {
    let sortableData = [...filteredData];

    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        // Permite uma função de acesso personalizada (ex.: ordenar por data+hora combinados)
        const aValue = sortAccessor ? sortAccessor(a) : a[sortConfig.key as keyof T];
        const bValue = sortAccessor ? sortAccessor(b) : b[sortConfig.key as keyof T];

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return sortableData;
  }, [filteredData, sortConfig, sortAccessor]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const currentData = pagination
    ? sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
    : sortedData;

  const handleSort = useCallback(
    (key: string) => {
      let direction: "asc" | "desc" = "asc";
      if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
        direction = "desc";
      }
      setSortConfig({ key, direction });
      setCurrentPage(1);
    },
    [sortConfig]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  const handleRowsPerPageChange = useCallback((value: string) => {
    const newRowsPerPage = parseInt(value, 10);
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);
  }, []);

  const rowsPerPageOptions = PAGINATION_OPTIONS.map((option) => ({
    value: option.toString(),
    label: option.toString(),
  }));

  const totalEntries = filteredData.length;
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalEntries);

  // Loading state
  if (loading) {
    return (
      <div className="bg-surface rounded-[14px] shadow-card border border-border overflow-hidden">
        <LoadingState className="h-64" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-[14px] shadow-card border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between border-b border-border">
        {pagination && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-muted">Mostrar</span>
            <div className="w-20">
              <Select
                options={rowsPerPageOptions}
                value={rowsPerPage.toString()}
                onChange={handleRowsPerPageChange}
                className="w-full"
              />
            </div>
            <span className="text-sm text-text-muted">{itemLabel}</span>
          </div>
        )}

        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10"
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <Table className="min-w-full">
          <TableHeader className="px-4 py-3 border-b border-border bg-gray-50">
            <TableRow>
              <TableCell isHeader className="px-4 py-3 text-xs font-semibold text-text-secondary text-center w-12">
                #
              </TableCell>
              {columns.map((column) => (
                <TableCell
                  key={String(column.key)}
                  isHeader
                  className="px-4 py-3 text-xs font-semibold text-text-secondary"
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <button
                        type="button"
                        className="flex flex-col leading-none cursor-pointer text-text-muted hover:text-text-primary"
                        onClick={() => handleSort(String(column.key))}
                      >
                        <span
                          className={`text-[8px] ${
                            sortConfig?.key === String(column.key) && sortConfig.direction === "asc"
                              ? "text-primary-500"
                              : ""
                          }`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-[8px] ${
                            sortConfig?.key === String(column.key) && sortConfig.direction === "desc"
                              ? "text-primary-500"
                              : ""
                          }`}
                        >
                          ▼
                        </span>
                      </button>
                    )}
                  </div>
                </TableCell>
              ))}
              {(onEdit || onDelete || onView || renderActions) && canManage && (
                <TableCell isHeader className="px-4 py-3 text-xs font-semibold text-text-secondary text-right">
                  Ações
                </TableCell>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row, index) => (
              <TableRow key={row.id} className="border-b border-border hover:bg-gray-50/50 last:border-0">
                <TableCell className="px-4 py-3 text-sm text-text-secondary text-center w-12 font-tabular-nums">
                  {pagination ? (currentPage - 1) * rowsPerPage + index + 1 : index + 1}
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={String(column.key)} className="px-4 py-3 text-sm text-text-primary">
                    {column.render
                      ? column.render(row[column.key as keyof T], row)
                      : String(row[column.key as keyof T] || "—")}
                  </TableCell>
                ))}
                {(onEdit || onDelete || onView || renderActions) && canManage && (
                  <TableCell className="px-4 py-3">
                    {renderActions ? (
                      renderActions(row)
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        {onView && (
                          <Tooltip content="Ver detalhes" position="top" theme="dark">
                            <button
                              onClick={() => onView(row)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                            >
                              <Eye size={15} />
                            </button>
                          </Tooltip>
                        )}
                        {onEdit && (
                          <Tooltip content="Editar" position="top" theme="dark">
                            <button
                              onClick={() => onEdit(row)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                            >
                              <Pencil size={15} />
                            </button>
                          </Tooltip>
                        )}
                        {onDelete && (
                          <Tooltip content="Eliminar" position="top" theme="dark">
                            <button
                              onClick={() => onDelete(row)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      {pagination && filteredData.length > 0 && (
        <div className="border-t border-border px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-text-muted text-center sm:text-left">
              A mostrar {startIndex + 1} a {endIndex} de {totalEntries} {itemLabel}
            </p>
            <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredData.length === 0 && emptyState && (
        <div className="px-6 py-12 text-center">
          {emptyState.action ? (
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Plus className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">{emptyState.title}</h3>
              <p className="text-sm text-text-muted mb-4">{emptyState.description}</p>
              {emptyState.action}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <Plus className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">{emptyState.title}</h3>
              <p className="text-sm text-text-muted">{emptyState.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DataTable;