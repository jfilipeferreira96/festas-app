"use client";

import React, { useState, useCallback } from "react";
import { Megaphone, Send, Trash2, Mail, MessageSquare } from "lucide-react";
import { PageHeader, StatusBadge, Button } from "@/components/ui";
import { Select } from "@/components/ui/select";
import DataTable from "@/components/ui/table/DataTable";
import ConfirmActionModal from "@/components/ui/modals/ConfirmActionModal";
import { useCampanhas, useCreateCampanha, useEnviarCampanha, useDeleteCampanha } from "@/hooks/use-campanhas";
import type { Campanha } from "@/lib/api/campanhas";
import type { StatusType } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";

const ESTADO_LABELS: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGENDADA: "Agendada",
  ENVIADA: "Enviada",
  CANCELADA: "Cancelada",
};

const SEGMENTO_OPTIONS = [
  { value: "todos", label: "Todos os clientes" },
  { value: "festas_realizadas", label: "Famílias com festas realizadas" },
  { value: "ultimo_ano", label: "Clientes do último ano" },
  { value: "pendentes", label: "Reservas pendentes" },
];

type TabType = "email" | "sms" | "historico";

export default function DivulgacoesContent() {
  const [activeTab, setActiveTab] = useState<TabType>("email");
  const { data: campanhas, isLoading } = useCampanhas();
  const createCampanha = useCreateCampanha();
  const enviarCampanha = useEnviarCampanha();
  const deleteCampanha = useDeleteCampanha();

  // Email form state
  const [assunto, setAssunto] = useState("");
  const [segmento, setSegmento] = useState("todos");
  const [mensagem, setMensagem] = useState("");

  // SMS form state
  const [smsTexto, setSmsTexto] = useState("");
  const [smsSegmento, setSmsSegmento] = useState("todos");
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string }>({ isOpen: false, id: "" });

  const handleSaveRascunho = useCallback(
    async (tipo: string) => {
      const data =
        tipo === "EMAIL"
          ? { tipo: tipo as "EMAIL" | "SMS", assunto, mensagem, segmento }
          : { tipo: tipo as "EMAIL" | "SMS", assunto: "SMS", mensagem: smsTexto, segmento: smsSegmento };
      await createCampanha.mutateAsync(data);
    },
    [assunto, mensagem, segmento, smsTexto, smsSegmento, createCampanha]
  );

  const handleEnviar = useCallback(
    async (id: string) => {
      await enviarCampanha.mutateAsync(id);
    },
    [enviarCampanha]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDeleteModal({ isOpen: true, id });
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    await deleteCampanha.mutateAsync(deleteModal.id);
    setDeleteModal({ isOpen: false, id: "" });
  }, [deleteCampanha, deleteModal.id]);

  const tabs: { value: TabType; label: string; icon: React.ReactNode }[] = [
    { value: "email", label: "Email", icon: <Mail size={14} /> },
    { value: "sms", label: "SMS", icon: <MessageSquare size={14} /> },
    { value: "historico", label: "Histórico", icon: <Megaphone size={14} /> },
  ];

  return (
    <div>
      <PageHeader
        title="Divulgações"
        subtitle="Campanhas de comunicação com clientes"
      />

      {/* Tabs */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <div className="flex items-center gap-1 rounded-xl bg-white border border-gray-200 p-1 shadow-theme-xs overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 shrink-0 ${
                activeTab === tab.value
                  ? "bg-brand-500 text-white shadow-theme-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Email Tab */}
      {activeTab === "email" && (
        <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Nova Campanha de Email
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Assunto
              </label>
              <input
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Assunto do email"
                className="h-11 w-full rounded-lg border border-border px-4 py-2.5 text-sm bg-transparent focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Segmento de Audiência
              </label>
              <Select
                options={SEGMENTO_OPTIONS}
                value={segmento}
                onChange={setSegmento}
                placeholder="Selecione um segmento"
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Mensagem
              </label>
              <p className="text-[10px] text-text-muted mb-1">
                Variáveis: {"{{nome}}"}, {"{{data_festa}}"}, {"{{nome_crianca}}"}
              </p>
              <textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Escreva a mensagem..."
                rows={8}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm bg-transparent focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleSaveRascunho("EMAIL")}
                disabled={createCampanha.isPending}
                className="bg-gray-200 text-text-primary hover:bg-gray-300"
              >
                Guardar Rascunho
              </Button>
              <Button
                onClick={() => handleSaveRascunho("EMAIL")}
                disabled={createCampanha.isPending}
              >
                <Send size={14} className="mr-1" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Tab */}
      {activeTab === "sms" && (
        <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Nova Campanha de SMS
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Segmento
              </label>
              <Select
                options={SEGMENTO_OPTIONS}
                value={smsSegmento}
                onChange={setSmsSegmento}
                placeholder="Selecione um segmento"
                className="w-full"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-text-secondary">
                  Texto do SMS
                </label>
                <span
                  className={`text-[10px] ${
                    smsTexto.length > 160
                      ? "text-accent-red"
                      : "text-text-muted"
                  }`}
                >
                  {smsTexto.length}/160
                </span>
              </div>
              <textarea
                value={smsTexto}
                onChange={(e) => setSmsTexto(e.target.value)}
                placeholder="Texto curto do SMS..."
                rows={4}
                maxLength={200}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm bg-transparent focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleSaveRascunho("SMS")}
                disabled={createCampanha.isPending}
                className="bg-gray-200 text-text-primary hover:bg-gray-300"
              >
                Guardar Rascunho
              </Button>
              <Button
                onClick={() => handleSaveRascunho("SMS")}
                disabled={createCampanha.isPending}
              >
                <Send size={14} className="mr-1" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Tab */}
      {activeTab === "historico" && (
        <DataTable<Campanha>
          data={campanhas || []}
          itemLabel="campanhas"
          columns={[
            {
              key: "tipo",
              label: "Tipo",
              render: (_v, c) =>
                c.tipo === "EMAIL" ? (
                  <Mail size={14} className="text-primary-500" />
                ) : (
                  <MessageSquare size={14} className="text-accent-green-500" />
                ),
            },
            {
              key: "assunto",
              label: "Assunto",
              sortable: true,
            },
            {
              key: "segmentoId",
              label: "Segmento",
              render: (v) => (
                <span className="text-xs text-text-secondary">{v || "-"}</span>
              ),
            },
            {
              key: "estado",
              label: "Estado",
              sortable: true,
              render: (_v, c) => (
                <StatusBadge status={c.estado as StatusType}>
                  {ESTADO_LABELS[c.estado] ?? c.estado}
                </StatusBadge>
              ),
            },
            {
              key: "enviadaEm",
              label: "Data",
              sortable: true,
              render: (_v, c) => (
                <span className="text-xs text-text-muted">
                  {c.enviadaEm
                    ? new Date(c.enviadaEm).toLocaleDateString("pt-PT")
                    : c.agendadaPara
                      ? `Agendado: ${new Date(c.agendadaPara).toLocaleDateString("pt-PT")}`
                      : "-"}
                </span>
              ),
            },
          ]}
          loading={isLoading}
          searchable
          searchPlaceholder="Pesquisar campanhas..."
          searchableFields={["assunto"]}
          pagination
          pageSize={10}
          canManage={true}
          renderActions={(c) => (
            <div className="flex items-center justify-end gap-1">
              {c.estado === "RASCUNHO" && (
                <Tooltip content="Enviar" position="top" theme="dark">
                  <button
                    onClick={() => handleEnviar(c.id)}
                    className="p-1.5 rounded-lg hover:bg-primary-50 text-text-muted hover:text-primary-500 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </Tooltip>
              )}
              {c.estado !== "ENVIADA" && (
                <Tooltip content="Eliminar" position="top" theme="dark">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-text-muted hover:text-accent-red transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </Tooltip>
              )}
            </div>
          )}
          emptyState={{
            title: "Nenhuma campanha encontrada",
            description: "Crie a sua primeira campanha de email ou SMS.",
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmActionModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: "" })}
        onConfirm={confirmDelete}
        title="Eliminar Campanha"
        message="Tem a certeza que deseja eliminar esta campanha? Esta acção não pode ser revertida."
        confirmText="Eliminar"
        variant="danger"
        isConfirming={deleteCampanha.isPending}
      />
    </div>
  );
}
