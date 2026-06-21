"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Save, StickyNote } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pt } from "date-fns/locale";
import { Button } from "@/components/ui";
import TextArea from "@/components/form/input/TextArea";
import { useNotaDiaria, useUpsertNotaDiaria } from "@/hooks/use-notas-diarias";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";

interface NotasDiariasPanelProps {
  data: string;
}

export default function NotasDiariasPanel({ data }: NotasDiariasPanelProps) {
  const { canWrite } = useMinhasPermissoes();
  const podeEditar = canWrite("monitores");

  const { data: notaData } = useNotaDiaria(data);
  const upsertNota = useUpsertNotaDiaria();

  const [notasManha, setNotasManha] = useState("");
  const [notasTarde, setNotasTarde] = useState("");

  const nota = notaData as { id?: string; notasManha?: string; notasTarde?: string } | null | undefined;

  useEffect(() => {
    setNotasManha(nota?.notasManha ?? "");
    setNotasTarde(nota?.notasTarde ?? "");
  }, [nota]);

  const handleSave = useCallback(async () => {
    await upsertNota.mutateAsync({
      data,
      notasManha,
      notasTarde,
    });
  }, [data, notasManha, notasTarde, upsertNota]);

  const formattedDate = (() => {
    try {
      return format(parseISO(data), "d 'de' MMMM", { locale: pt });
    } catch {
      return data;
    }
  })();

  return (
    <div className="p-4 rounded-xl bg-white border border-border shadow-theme-xs">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-50">
          <StickyNote size={16} className="text-primary-500" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">
          Notas do Dia — {formattedDate}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
            Manhã
          </label>
          {podeEditar ? (
            <TextArea
              placeholder="Ex.: Nena faz parque/lanche..."
              value={notasManha}
              onChange={(v) => setNotasManha(v)}
              rows={4}
            />
          ) : (
            <div className="p-3 rounded-lg bg-gray-50 border border-border min-h-[100px]">
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {notasManha || "—"}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1.5 block">
            Tarde
          </label>
          {podeEditar ? (
            <TextArea
              placeholder="Ex.: Heloisa faz cacifos/parques..."
              value={notasTarde}
              onChange={(v) => setNotasTarde(v)}
              rows={4}
            />
          ) : (
            <div className="p-3 rounded-lg bg-gray-50 border border-border min-h-[100px]">
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {notasTarde || "—"}
              </p>
            </div>
          )}
        </div>
      </div>

      {podeEditar && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleSave}
            disabled={upsertNota.isPending}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {upsertNota.isPending ? "A guardar..." : "Guardar Notas"}
          </Button>
        </div>
      )}
    </div>
  );
}
