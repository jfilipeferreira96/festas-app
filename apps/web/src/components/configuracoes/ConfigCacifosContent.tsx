"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Save, Package, LockKeyhole } from "lucide-react";
import { PageHeader, Button } from "@/components/ui";
import { Card } from "@/components/ui/card";
import InputField from "@/components/form/input/InputField";
import { useConfigCacifo, useAtualizarConfigCacifo } from "@/hooks/use-config-cacifo";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function ConfigCacifosContent() {
  const { data: configData, isLoading } = useConfigCacifo();
  const atualizarConfig = useAtualizarConfigCacifo();

  const [totalCacifos, setTotalCacifos] = useState(200);
  const [nomes, setNomes] = useState<Record<number, string>>({});

  // Sync config data (includes cacifos with names)
  useEffect(() => {
    if (configData?.data) {
      setTotalCacifos(configData.data.totalCacifos);
      const nomesMap: Record<number, string> = {};
      configData.data.cacifos?.forEach((c) => {
        if (c.nome) nomesMap[c.numero] = c.nome;
      });
      setNomes(nomesMap);
    }
  }, [configData]);

  const handleSaveConfig = useCallback(async () => {
    await atualizarConfig.mutateAsync({ totalCacifos });
  }, [totalCacifos, atualizarConfig]);

  const handleSaveNomes = useCallback(async () => {
    const nomesRecord: Record<number, string> = {};
    Object.entries(nomes)
      .filter(([, nome]) => nome.trim())
      .forEach(([numero, nome]) => {
        nomesRecord[Number(numero)] = nome;
      });
    await atualizarConfig.mutateAsync({ totalCacifos, nomes: nomesRecord });
  }, [nomes, totalCacifos, atualizarConfig]);

  const handleNomeChange = useCallback((numero: number, nome: string) => {
    setNomes((prev) => ({ ...prev, [numero]: nome }));
  }, []);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Configuração de Cacifos"
        subtitle="Defina o número total de cacifos e atribua nomes personalizados"
      />

      <div className="mt-4 space-y-6">
        {/* Total config */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Package size={18} className="text-brand-500" />
            <h3 className="text-sm font-medium text-text-primary">Número Total de Cacifos</h3>
          </div>
          <div className="flex items-end gap-4">
            <div className="w-40">
              <InputField
                type="number"
                min={1}
                max={500}
                defaultValue={totalCacifos}
                onChange={(e) => setTotalCacifos(Number((e.target as HTMLInputElement).value))}
                placeholder="200"
              />
            </div>
            <Button
              onClick={handleSaveConfig}
              disabled={atualizarConfig.isPending}
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {atualizarConfig.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </div>
          <p className="text-xs text-text-muted mt-2">
            Ao alterar o número total, cacifos existentes serão mantidos. Novos cacifos serão numerados automaticamente.
          </p>
        </Card>

        {/* Nomes */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LockKeyhole size={18} className="text-brand-500" />
              <h3 className="text-sm font-medium text-text-primary">Nomes dos Cacifos</h3>
            </div>
            <Button
              onClick={handleSaveNomes}
              disabled={atualizarConfig.isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Save size={16} />
              {atualizarConfig.isPending ? "A guardar..." : "Guardar Nomes"}
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {Array.from({ length: totalCacifos }, (_, i) => i + 1).map((numero) => (
              <div key={numero} className="flex flex-col">
                <span className="text-xs text-text-muted mb-1">#{numero}</span>
                <input
                  type="text"
                  value={nomes[numero] || ""}
                  onChange={(e) => handleNomeChange(numero, e.target.value)}
                  placeholder={`Cacifo ${numero}`}
                  className="h-9 rounded border border-gray-300 px-2 text-xs bg-transparent text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
