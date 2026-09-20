"use client";

import React, { useMemo } from "react";
import { Cake, Mail, RefreshCw, Users } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import LoadingState from "@/components/ui/LoadingState";
import { useSegmentosNewsletter, useSincronizarAniversariantes } from "@/hooks/use-newsletter";
import { useToast } from "@/hooks/use-toast";
import type { SegmentoNewsletter } from "@/lib/api/newsletter";

/**
 * Newsletter (Configurações): segmentos de contactos + sincronização do
 * segmento "Aniversariantes" (alimenta os emails automáticos de aniversário,
 * que respeitam o opt-out do cliente - ver src/services/marketing.service.ts).
 */
export default function NewsletterPage() {
  const { data: segmentos, isLoading } = useSegmentosNewsletter();
  const sincronizar = useSincronizarAniversariantes();
  const toast = useToast();

  const columns: Column<SegmentoNewsletter>[] = useMemo(
    () => [
      {
        key: "nome",
        label: "Segmento",
        render: (_v, r) => (
          <div>
            <p className="text-sm font-medium text-text-primary">{r.nome}</p>
            {r.descricao && <p className="text-xs text-text-muted">{r.descricao}</p>}
          </div>
        ),
      },
      {
        key: "contactos",
        label: "Contactos",
        sortable: true,
        render: (_v, r) => (
          <span className="text-sm font-semibold text-text-primary">{r._count?.contactos ?? 0}</span>
        ),
      },
    ],
    []
  );

  const handleSincronizar = React.useCallback(async () => {
    try {
      const res = await sincronizar.mutateAsync();
      toast.success(
        `Aniversariantes sincronizados: ${res.data.criados} criados, ${res.data.actualizados} atualizados (${res.data.total} no total).`
      );
    } catch (err) {
      toast.handleApiError(err, "Não foi possível sincronizar os aniversariantes.");
    }
  }, [sincronizar, toast]);

  return (
    <div>
      <PageHeader
        title="Newsletter"
        subtitle="Segmentos de contactos para comunicações por email"
        actions={
          <Button
            onClick={handleSincronizar}
            disabled={sincronizar.isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw size={16} className={sincronizar.isPending ? "animate-spin" : ""} />
            Sincronizar aniversariantes
          </Button>
        }
      />

      {/* Explicação dos fluxos de marketing por email */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-border shadow-card">
          <Cake size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Emails de aniversário</p>
            <p className="text-xs text-text-muted mt-0.5">
              Enviados automaticamente 30 dias antes do aniversário de cada criança (uma vez por ano,
              com link de cancelamento). Respeitam o opt-out global do cliente.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4 rounded-xl bg-surface border border-border shadow-card">
          <Mail size={18} className="text-brand-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-text-primary">Emails transacionais</p>
            <p className="text-xs text-text-muted mt-0.5">
              Confirmação de marcação, verificação de conta e reset de password - via SMTP com fila e
              reprocessamento automático.
            </p>
          </div>
        </div>
      </div>

      {/* Segmentos */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
          <Users size={14} className="text-brand-500" /> Segmentos
        </h3>
        {isLoading ? (
          <div className="bg-surface rounded-[14px] shadow-card border border-border">
            <LoadingState className="h-48" message="A carregar segmentos..." />
          </div>
        ) : (
          <DataTable<SegmentoNewsletter>
            data={segmentos ?? []}
            itemLabel="segmentos"
            columns={columns}
            searchable
            searchPlaceholder="Pesquisar segmento..."
            searchableFields={["nome"]}
            pagination
            pageSize={10}
            emptyState={{
              title: "Sem segmentos",
              description: "Sincronize os aniversariantes para criar o primeiro segmento.",
            }}
          />
        )}
      </div>
    </div>
  );
}
