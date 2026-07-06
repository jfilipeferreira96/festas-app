"use client";

import React, { useState, useCallback, useMemo } from "react";
import { UserCog, Plus, Clock, Calculator, Pencil, Trash2, Users, Wallet } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ProfilePhotoUpload from "@/components/ui/ProfilePhotoUpload";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Modal } from "@/components/ui/modal";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import InputField from "@/components/form/input/InputField";
import DatePicker from "@/components/form/date-picker";
import Switch from "@/components/form/switch/Switch";
import DataTable from "@/components/ui/table/DataTable";
import type { Column } from "@/components/ui/table/DataTable";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useMonitores, useCreateMonitor, useUpdateMonitor, useDeleteMonitor } from "@/hooks/use-monitores";
import { useCalcularHorasMonitor, useResumoMensalMonitores } from "@/hooks/use-alocacoes-monitor";
import { formatShortDate } from "@/utils/date";
import type { Monitor } from "@/lib/api/monitores";
import type { StatusType } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import { useUser } from "@/contexts/AuthContext";

const SERVER_URL = ""; // Single-app: API/uploads served same-origin via Next.js Route Handlers

// --- Zod Schema ---
const monitorSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  contacto: z.string().min(9, "Contacto inválido (mín. 9 dígitos)"),
  activo: z.boolean(),
  valorHora: z.number().min(0, "O valor por hora não pode ser negativo").optional().nullable(),
});

type MonitorFormData = z.infer<typeof monitorSchema>;

// --- Currency helper ---
const euro = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" });

/** Converte "dd-mm-yyyy" (formato do DatePicker) → "yyyy-mm-dd" (ISO esperado pela API). */
function dmyToIso(dateStr: string): string {
  const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return dateStr; // já ISO ou vazio — devolver inalterado
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export default function MonitoresContent() {
  const { data: monitores, isLoading } = useMonitores();
  const createMonitor = useCreateMonitor();
  const updateMonitor = useUpdateMonitor();
  const deleteMonitor = useDeleteMonitor();

  // Apenas ADMINISTRADOR vê valor/hora e cálculo de horas trabalhadas
  const { user } = useUser();
  const isAdmin = user?.funcao === "ADMINISTRADOR";

  const [showForm, setShowForm] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; nome: string }>({ isOpen: false, id: "", nome: "" });

  // --- Horas trabalhadas modal state (admin only) ---
  const [horasModal, setHorasModal] = useState<{ isOpen: boolean; monitor: Monitor | null }>({ isOpen: false, monitor: null });
  const [horasInicio, setHorasInicio] = useState("");
  const [horasFim, setHorasFim] = useState("");
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // --- Compensações tab (admin only) ---
  const [activeTab, setActiveTab] = useState<"lista" | "compensacoes">("lista");
  const mesAtual = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const { data: resumoMensal, isLoading: resumoLoading } = useResumoMensalMonitores(
    activeTab === "compensacoes" && isAdmin ? mesSelecionado : "",
  );

  // Gerar opções de meses (6 meses atrás + 1 mês à frente)
  const mesesOptions = useMemo(() => {
    const meses: { value: string; label: string }[] = [];
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const now = new Date();
    for (let i = -6; i <= 1; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      meses.push({ value, label: `${nomesMeses[d.getMonth()]} ${d.getFullYear()}` });
    }
    return meses;
  }, []);

  const totalMes = useMemo(() => {
    if (!resumoMensal) return { dias: 0, horas: 0, custo: 0 };
    return resumoMensal.reduce(
      (acc, m) => ({
        dias: acc.dias + m.dias,
        horas: acc.horas + m.horas,
        custo: acc.custo + m.custoTotal,
      }),
      { dias: 0, horas: 0, custo: 0 },
    );
  }, [resumoMensal]);

  // Só busca quando o modal está aberto e há um trigger explícito (clicar em "Calcular")
  const horasEnabled = horasModal.isOpen && fetchTrigger > 0;

  const horasData = useCalcularHorasMonitor(
    horasModal.monitor?.id ?? null,
    horasInicio || undefined,
    horasFim || undefined,
    horasEnabled,
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MonitorFormData>({
    resolver: zodResolver(monitorSchema),
    defaultValues: {
      nome: "",
      contacto: "",
      activo: true,
      valorHora: null,
    },
  });

  const activo = watch("activo");
  const nome = watch("nome");

  // --- Conditional table columns ---
  const columns: Column<Monitor>[] = useMemo(() => {
    const cols: Column<Monitor>[] = [
      {
        key: "nome",
        label: "Nome",
        sortable: true,
        render: (_value, m) => (
          <div className="flex items-center gap-2">
            {m.fotoUrl ? (
              <img
                src={m.fotoUrl}
                alt={m.nome}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                <UserCog size={14} className="text-primary-500" />
              </div>
            )}
            <span className="text-sm font-medium text-text-primary">{m.nome}</span>
          </div>
        ),
      },
      {
        key: "contacto",
        label: "Contacto",
        sortable: true,
      },
    ];

    if (isAdmin) {
      cols.push({
        key: "valorHora",
        label: "Valor/Hora",
        sortable: true,
        render: (_value, m) => (
          <span className="text-sm text-text-secondary">
            {m.valorHora != null ? euro.format(Number(m.valorHora)) : "—"}
          </span>
        ),
      });
    }

    cols.push({
      key: "activo",
      label: "Estado",
      sortable: true,
      render: (_value, m) => (
        <StatusBadge status={m.activo ? ("ACTIVO" as StatusType) : ("INACTIVO" as StatusType)}>
          {m.activo ? "Activo" : "Inactivo"}
        </StatusBadge>
      ),
    });

    return cols;
  }, [isAdmin]);

  /** Upload a pending photo file after entity creation */
  const uploadPendingPhoto = useCallback(async (entityId: string, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    try {
      await fetch(`${SERVER_URL}/api/upload/monitor/${entityId}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
    } catch {
      // Silently fail — photo is optional, entity was already created
    }
  }, []);

  const handleCreate = useCallback(() => {
    setEditingMonitor(null);
    setPendingPhotoFile(null);
    reset({ nome: "", contacto: "", activo: true, valorHora: null });
    setShowForm(true);
  }, [reset]);

  const handleEdit = useCallback(
    (monitor: Monitor) => {
      setEditingMonitor(monitor);
      setPendingPhotoFile(null);
      reset({
        nome: monitor.nome,
        contacto: monitor.contacto,
        activo: monitor.activo,
        valorHora: monitor.valorHora != null ? Number(monitor.valorHora) : null,
      });
      setShowForm(true);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (data: MonitorFormData) => {
      if (editingMonitor) {
        await updateMonitor.mutateAsync({
          id: editingMonitor.id,
          data: {
            nome: data.nome,
            contacto: data.contacto,
            activo: data.activo,
            valorHora: isAdmin ? (data.valorHora ?? null) : null,
          },
        });
      } else {
        const newMonitor = await createMonitor.mutateAsync({
          nome: data.nome,
          contacto: data.contacto,
          activo: data.activo,
          valorHora: isAdmin ? (data.valorHora ?? null) : null,
        });

        // Upload pending photo if one was selected
        if (pendingPhotoFile && newMonitor?.id) {
          await uploadPendingPhoto(newMonitor.id, pendingPhotoFile);
        }
      }
      setShowForm(false);
      setPendingPhotoFile(null);
    },
    [editingMonitor, createMonitor, updateMonitor, pendingPhotoFile, uploadPendingPhoto, isAdmin]
  );

  const handleDelete = useCallback(
    (monitor: Monitor) => {
      setDeleteModal({ isOpen: true, id: monitor.id, nome: monitor.nome });
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    await deleteMonitor.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "", nome: "" });
  }, [deleteMonitor, deleteModal.id]);

  // --- Horas trabalhadas handlers ---
  const handleOpenHoras = useCallback((monitor: Monitor) => {
    setFetchTrigger(0);
    setHorasInicio("");
    setHorasFim("");
    setHorasModal({ isOpen: true, monitor });
  }, []);

  const handleCalcularHoras = useCallback(() => {
    // Ao incrementar o trigger, `horasEnabled` passa a true e o hook dispara o fetch.
    setFetchTrigger((n) => n + 1);
  }, []);

  const closeHorasModal = useCallback(() => {
    setHorasModal({ isOpen: false, monitor: null });
    setFetchTrigger(0);
  }, []);

  // Resultado só é válido quando enabled e fetched
  const horasResultado = horasEnabled ? horasData.data : undefined;

  return (
    <div>
      <PageHeader
        title="Monitores"
        subtitle="Gestão de monitores e alocação"
        actions={
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus size={16} />
            Novo Monitor
          </Button>
        }
      />

      {/* Tabs (admin only sees compensações) */}
      <div className="flex items-center gap-3 mt-4 mb-4">
        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("lista")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
              activeTab === "lista"
                ? "bg-brand-500 text-white shadow-theme-sm"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Users size={15} />
            Lista de Monitores
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("compensacoes")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                activeTab === "compensacoes"
                  ? "bg-brand-500 text-white shadow-theme-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Wallet size={15} />
              Compensações
            </button>
          )}
        </div>
      </div>

      {/* ── Tab: Lista ── */}
      {activeTab === "lista" && (
      <div className="mt-4">
        <DataTable<Monitor>
          data={monitores || []}
          columns={columns}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar monitores..."
          searchableFields={["nome", "contacto"]}
          itemLabel="monitores"
          pagination
          pageSize={10}
          onEdit={isAdmin ? undefined : handleEdit}
          onDelete={handleDelete}
          {...(isAdmin
            ? {
                renderActions: (m: Monitor) => (
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip content="Horas trabalhadas" position="top" theme="dark">
                      <button
                        onClick={() => handleOpenHoras(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                      >
                        <Clock size={15} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Editar" position="top" theme="dark">
                      <button
                        onClick={() => handleEdit(m)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary-500 transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Eliminar" position="top" theme="dark">
                      <button
                        onClick={() => handleDelete(m)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </Tooltip>
                  </div>
                ),
              }
            : {})}
          emptyState={{
            title: "Nenhum monitor encontrado",
            description: "Comece por criar o primeiro monitor.",
            action: (
              <Button onClick={handleCreate} className="flex items-center gap-2">
                <Plus size={16} />
                Novo Monitor
              </Button>
            ),
          }}
        />
      </div>
      )}

      {/* ── Tab: Compensações (admin only) ── */}
      {activeTab === "compensacoes" && isAdmin && (
        <div className="mt-4">
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-text-secondary">Mês:</label>
            <div className="w-52">
              <Select
                options={mesesOptions}
                value={mesSelecionado}
                onChange={(value) => setMesSelecionado(value)}
              />
            </div>
          </div>

          {resumoLoading ? (
            <Card>
              <div className="py-12 text-center text-sm text-text-secondary">A carregar dados...</div>
            </Card>
          ) : resumoMensal && resumoMensal.length > 0 ? (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto rounded-[12px]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-text-secondary">Monitor</th>
                      <th className="px-4 py-3 text-center font-medium text-text-secondary">Dias</th>
                      <th className="px-4 py-3 text-center font-medium text-text-secondary">Horas</th>
                      <th className="px-4 py-3 text-right font-medium text-text-secondary">Valor/Hora</th>
                      <th className="px-4 py-3 text-right font-medium text-text-secondary">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumoMensal.map((m) => (
                      <tr key={m.monitorId} className="border-b border-border last:border-0 hover:bg-gray-50/50">
                        <td className="px-4 py-3 text-text-primary font-medium">{m.monitorNome}</td>
                        <td className="px-4 py-3 text-center text-text-primary">{m.dias}</td>
                        <td className="px-4 py-3 text-center text-text-primary">{m.horas.toFixed(1)} h</td>
                        <td className="px-4 py-3 text-right text-text-primary">
                          {m.valorHora > 0 ? euro.format(m.valorHora) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-brand-500 font-semibold">
                          {euro.format(m.custoTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-text-primary">Total</td>
                      <td className="px-4 py-3 text-center text-text-primary">{totalMes.dias}</td>
                      <td className="px-4 py-3 text-center text-text-primary">{totalMes.horas.toFixed(1)} h</td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right text-brand-500">{euro.format(totalMes.custo)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="py-12 text-center text-sm text-text-muted">
                Sem alocações registadas para este mês.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "", nome: "" })}
        onConfirm={confirmDelete}
        title="Eliminar Monitor"
        message={`Tem a certeza que deseja eliminar o monitor "${deleteModal.nome}"? Esta acção não pode ser revertida.`}
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteMonitor.isPending}
      />

      {/* Form Modal */}
      {showForm && (
        <Modal isOpen={showForm} onClose={() => setShowForm(false)}>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-6">
              {editingMonitor ? "Editar Monitor" : "Novo Monitor"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Profile Photo Section */}
              <div>
                <h4 className="mb-4 text-sm font-medium text-text-primary">
                  {editingMonitor ? "Alterar Foto de Perfil" : "Foto de Perfil"}
                </h4>
                <div className="mb-4 flex max-w-sm items-center gap-5">
                  {editingMonitor ? (
                    <ProfilePhotoUpload
                      currentPhotoUrl={editingMonitor.fotoUrl}
                      name={nome}
                      uploadEndpoint={`/api/upload/monitor/${editingMonitor.id}`}
                      size={80}
                      onUploadSuccess={(imageUrl) => {
                        setEditingMonitor({ ...editingMonitor, fotoUrl: imageUrl });
                      }}
                    />
                  ) : (
                    <ProfilePhotoUpload
                      name={nome}
                      size={80}
                      onFileSelect={(file) => setPendingPhotoFile(file)}
                      pendingFile={pendingPhotoFile}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nome</label>
                <InputField
                  {...register("nome")}
                  placeholder="Nome do monitor"
                  error={!!errors.nome}
                  hint={errors.nome?.message}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Contacto</label>
                <InputField
                  type="tel"
                  {...register("contacto")}
                  placeholder="912 345 678"
                  error={!!errors.contacto}
                  hint={errors.contacto?.message}
                />
              </div>
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">Valor/Hora (€)</label>
                  <InputField
                    type="number"
                    step={0.01}
                    min="0"
                    {...register("valorHora", {
                      setValueAs: (v) => {
                        if (v === "" || v === null || v === undefined) return null;
                        const n = parseFloat(v);
                        return isNaN(n) ? null : n;
                      },
                    })}
                    placeholder="0,00"
                    error={!!errors.valorHora}
                    hint={errors.valorHora?.message}
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">Estado</label>
                <Switch
                  checked={activo}
                  onChange={(checked: boolean) => setValue("activo", checked)}
                  label={activo ? "Activo" : "Inactivo"}
                />
              </div>
              <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "A guardar..." : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Horas Trabalhadas Modal (admin only) */}
      {isAdmin && horasModal.isOpen && horasModal.monitor && (
        <Modal isOpen={horasModal.isOpen} onClose={closeHorasModal} size="md">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-primary-500" />
              <h2 className="text-lg font-semibold text-text-primary">Horas Trabalhadas</h2>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              Monitor: <span className="font-medium text-text-primary">{horasModal.monitor.nome}</span>
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Data Início</label>
                <DatePicker
                  id="horas-inicio"
                  mode="single"
                  defaultDate={horasInicio ? new Date(horasInicio + "T00:00:00") : undefined}
                  onChange={(_dates, dateStr) => setHorasInicio(dmyToIso(dateStr))}
                  placeholder="Seleccionar data"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Data Fim</label>
                <DatePicker
                  id="horas-fim"
                  mode="single"
                  defaultDate={horasFim ? new Date(horasFim + "T00:00:00") : undefined}
                  onChange={(_dates, dateStr) => setHorasFim(dmyToIso(dateStr))}
                  placeholder="Seleccionar data"
                />
              </div>
            </div>

            <div className="flex justify-end mb-4">
              <Button onClick={handleCalcularHoras} className="flex items-center gap-2">
                <Calculator size={16} />
                Calcular
              </Button>
            </div>

            {horasData.isFetching && (
              <div className="py-8 text-center text-sm text-text-secondary">A calcular...</div>
            )}

            {horasResultado && !horasData.isFetching && (
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Alocações no período</span>
                  <span className="font-medium text-text-primary">{horasResultado.alocacoes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Total de horas</span>
                  <span className="font-medium text-text-primary">
                    {horasResultado.totalHoras.toFixed(1)} h
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Valor/Hora</span>
                  <span className="font-medium text-text-primary">
                    {horasResultado.valorHora > 0 ? euro.format(horasResultado.valorHora) : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-base font-semibold border-t border-border pt-2 mt-2">
                  <span className="text-text-primary">Custo Total</span>
                  <span className="text-primary-500">{euro.format(horasResultado.valorTotal)}</span>
                </div>

                {/* Detalhe por dia */}
                {horasResultado.detalhes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                      Detalhe por dia
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                      {horasResultado.detalhes.map((d) => (
                        <div key={d.data} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0">
                            <span className="font-medium text-text-primary">{formatShortDate(d.data)}</span>
                            {d.locais.length > 0 && (
                              <span className="ml-2 text-xs text-text-muted truncate">
                                {d.locais.join(", ")}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-text-primary shrink-0">
                            {d.horas.toFixed(1)} h
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!horasResultado && !horasData.isFetching && fetchTrigger === 0 && (
              <div className="py-6 text-center text-sm text-text-muted">
                Seleccione um intervalo de datas e clique em &ldquo;Calcular&rdquo;.
              </div>
            )}

            {horasData.isError && !horasData.isFetching && fetchTrigger > 0 && (
              <div className="py-4 text-center text-sm text-accent-red">
                Erro ao calcular horas. Tente novamente.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
