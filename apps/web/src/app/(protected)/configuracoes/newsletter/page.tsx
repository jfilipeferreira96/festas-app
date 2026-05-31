"use client";

import { PageHeader } from "@/components/ui";
import { Mail } from "lucide-react";

export default function NewsletterPage() {
  return (
    <div>
      <PageHeader title="Newsletter" subtitle="Gestão de contactos e campanhas de email" />
      <div className="bg-surface rounded-[14px] p-8 shadow-card border border-border mt-4 text-center">
        <Mail size={48} className="mx-auto text-text-muted mb-3" />
        <p className="text-sm text-text-muted">
          Gestão de newsletter — em desenvolvimento.
        </p>
        <p className="text-xs text-text-muted mt-1">
          Consulte a página de Divulgações para criar e gerir campanhas.
        </p>
      </div>
    </div>
  );
}
