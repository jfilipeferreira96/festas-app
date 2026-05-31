"use client";

import React, { useState, useCallback, useMemo } from "react";
import { ShieldCheck, RotateCcw, Check, Lock, Info } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  usePermissoes,
  useUpdatePermissao,
  useRestaurarDefaults,
} from "@/hooks/use-permissoes";
import Select from "@/components/form/Select";
import {
  MODULOS,
  NIVEIS_ACESSO,
  MODULO_LABELS,
  FUNCAO_LABELS,
  FUNCOES,
  type Permissao,
} from "@/lib/api/permissoes";

// Level color coding
const nivelColors: Record<string, string> = {
  sem_acesso: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  leitura: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  escrita: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  administracao: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

// Level dot color (for legend)
const nivelDotColors: Record<string, string> = {
  sem_acesso: "bg-gray-400 dark:bg-gray-500",
  leitura: "bg-blue-500 dark:bg-blue-400",
  escrita: "bg-amber-500 dark:bg-amber-400",
  administracao: "bg-green-500 dark:bg-green-400",
};

// Read-only label map for ADMINISTRADOR badges
const nivelLabels: Record<string, string> = {
  sem_acesso: "Sem acesso",
  leitura: "Leitura",
  escrita: "Escrita",
  administracao: "Administração",
};

const nivelOptions = NIVEIS_ACESSO.map((n) => ({ value: n.value, label: n.label }));

const funcaoBadgeStyles: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  GESTOR: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  RECECAO: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MARKETING: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function PermissoesContent() {
  const { data: permissoes, isLoading } = usePermissoes();
  const updatePermissao = useUpdatePermissao();
  const restaurarDefaults = useRestaurarDefaults();

  const [showSuccess, setShowSuccess] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Build a map: { "FUNCAO__modulo": nivelAcesso }
  const permissaoMap = useMemo(() => {
    const map: Record<string, string> = {};
    (permissoes || []).forEach((p: Permissao) => {
      map[`${p.funcao}__${p.modulo}`] = p.nivelAcesso;
    });
    return map;
  }, [permissoes]);

  const handleChange = useCallback(
    (funcao: string, modulo: string, nivelAcesso: string) => {
      updatePermissao.mutate(
        { funcao, modulo, nivelAcesso },
        {
          onSuccess: () => {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
          },
        }
      );
    },
    [updatePermissao]
  );

  const handleRestaurarDefaults = useCallback(async () => {
    setShowRestoreModal(true);
  }, []);

  const confirmRestaurarDefaults = useCallback(async () => {
    await restaurarDefaults.mutateAsync();
    setShowRestoreModal(false);
  }, [restaurarDefaults]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Permissões"
        subtitle="Configure o acesso de cada função aos módulos do sistema"
        actions={
          <div className="flex items-center gap-2">
            {showSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="w-4 h-4" />
                Guardado
              </span>
            )}
            <Button
              variant="outline"
              onClick={handleRestaurarDefaults}
              disabled={restaurarDefaults.isPending}
              startIcon={<RotateCcw className="w-4 h-4" />}
            >
              Restaurar Padrão
            </Button>
          </div>
        }
      />

      {/* Info Banner */}
      <div className="mt-6 flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3">
        <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          As permissões do <strong>Administrador</strong> são fixas e não podem ser alteradas.
          Apenas as funções Gestor, Receção e Marketing podem ser configuradas.
        </p>
      </div>

      <div className="mt-6">
        <div className="bg-surface rounded-[14px] shadow-card border border-border overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto custom-scrollbar">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-text-secondary min-w-[140px]">
                    Função
                  </th>
                  {MODULOS.map((modulo) => (
                    <th
                      key={modulo}
                      className="text-center px-3 py-3 text-xs font-semibold text-text-secondary min-w-[120px]"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <ShieldCheck className="w-4 h-4 text-text-muted" />
                        {MODULO_LABELS[modulo]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FUNCOES.map((funcao) => {
                  const isAdmin = funcao === "ADMINISTRADOR";
                  return (
                    <tr
                      key={funcao}
                      className={`border-b border-border last:border-0 ${
                        isAdmin
                          ? "bg-gray-50/80 dark:bg-gray-800/30"
                          : "hover:bg-gray-50/50 dark:hover:bg-gray-800/20"
                      }`}
                    >
                      <td className="px-4 py-3 text-sm text-text-primary">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full ${
                            funcaoBadgeStyles[funcao] || ""
                          }`}
                        >
                          {FUNCAO_LABELS[funcao]}
                          {isAdmin && <Lock className="w-3 h-3" />}
                        </span>
                      </td>
                      {MODULOS.map((modulo) => {
                        const key = `${funcao}__${modulo}`;
                        const nivel = permissaoMap[key] || "sem_acesso";
                        const isUpdating =
                          updatePermissao.isPending &&
                          updatePermissao.variables?.funcao === funcao &&
                          updatePermissao.variables?.modulo === modulo;

                        return (
                          <td key={modulo} className="px-3 py-3 text-center">
                            {isAdmin ? (
                              /* Read-only badge for ADMINISTRADOR */
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${nivelColors[nivel] || ""}`}
                              >
                                {nivelLabels[nivel] || nivel}
                              </span>
                            ) : (
                              /* Editable Select for other roles */
                              <div className="relative">
                                <Select
                                  options={nivelOptions}
                                  value={nivel}
                                  onChange={(val) => handleChange(funcao, modulo, val)}
                                  className={`!h-8 !min-w-[110px] !rounded-lg !px-2 !py-1 !text-xs !font-medium !border-transparent !shadow-none text-center ${
                                    nivelColors[nivel] || ""
                                  } ${isUpdating ? "opacity-50 pointer-events-none" : ""}`}
                                />
                                {isUpdating && (
                                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                    <div className="w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-4 space-y-4">
            {FUNCOES.map((funcao) => {
              const isAdmin = funcao === "ADMINISTRADOR";
              return (
                <div key={funcao} className="bg-background rounded-xl p-4 border border-border">
                  <h3
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full mb-3 ${
                      funcaoBadgeStyles[funcao] || ""
                    }`}
                  >
                    {FUNCAO_LABELS[funcao]}
                    {isAdmin && <Lock className="w-3 h-3" />}
                  </h3>
                  <div className="space-y-2">
                    {MODULOS.map((modulo) => {
                      const key = `${funcao}__${modulo}`;
                      const nivel = permissaoMap[key] || "sem_acesso";
                      return (
                        <div
                          key={modulo}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-sm text-text-secondary">
                            {MODULO_LABELS[modulo]}
                          </span>
                          {isAdmin ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${nivelColors[nivel] || ""}`}
                            >
                              {nivelLabels[nivel] || nivel}
                            </span>
                          ) : (
                            <div className="w-[130px]">
                              <Select
                                options={nivelOptions}
                                value={nivel}
                                onChange={(val) => handleChange(funcao, modulo, val)}
                                className={`!h-8 !rounded-lg !px-2 !py-1 !text-xs !font-medium !border-transparent !shadow-none ${
                                  nivelColors[nivel] || ""
                                }`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="border-t border-border px-4 py-3 flex flex-wrap gap-4">
            {NIVEIS_ACESSO.map((nivel) => (
              <div key={nivel.value} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${nivelDotColors[nivel.value] || ""}`} />
                <span className="text-xs text-text-muted">{nivel.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Restaurar Padrão */}
      <ConfirmActionModal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onConfirm={confirmRestaurarDefaults}
        title="Restaurar Permissões Padrão"
        message="Tem a certeza que deseja restaurar todas as permissões para os valores padrão? As alterações manuais serão perdidas."
        confirmText="Sim, Restaurar"
        cancelText="Cancelar"
        variant="warning"
        isConfirming={restaurarDefaults.isPending}
      />
    </div>
  );
}