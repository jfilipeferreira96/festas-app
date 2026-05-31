"use client";

import { PageHeader } from "@/components/ui";
import Button from "@/components/ui/button/Button";
import { Plus } from "lucide-react";
import UtilizadoresContent from "@/components/configuracoes/UtilizadoresContent";
import { useState } from "react";

export default function UtilizadoresPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Utilizadores"
        subtitle="Gestão de acessos ao sistema"
        actions={
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            startIcon={<Plus className="w-4 h-4" />}
          >
            Novo Utilizador
          </Button>
        }
      />
      <div className="mt-4">
        <UtilizadoresContent isCreateModalOpen={isCreateModalOpen} setIsCreateModalOpen={setIsCreateModalOpen} />
      </div>
    </div>
  );
}