"use client";

import { useFormContext } from "react-hook-form";
import { MessageSquare } from "lucide-react";
import TextArea from "@/components/form/input/TextArea";
import type { EntradaLivreFormData } from "../entrada-livre-form.schema";

export default function ObservacoesSection() {
  const { watch, setValue } = useFormContext<EntradaLivreFormData>();

  return (
    <div className="space-y-3">
      <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <MessageSquare size={14} className="text-brand-500" /> Observações
      </span>
      <div>
        <span className="text-xs font-medium text-text-secondary block mb-1">Observações gerais</span>
        <TextArea
          placeholder="Notas gerais..."
          rows={2}
          value={watch("observacoes")}
          onChange={(v) => setValue("observacoes", v)}
        />
      </div>
      <div>
        <span className="text-xs font-medium text-text-secondary block mb-1">Lesões / Alergias</span>
        <TextArea
          placeholder="Alergias, lesões..."
          rows={2}
          value={watch("observacoesLesoes")}
          onChange={(v) => setValue("observacoesLesoes", v)}
        />
      </div>
    </div>
  );
}
