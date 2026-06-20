"use client";

import React, { useEffect, useState } from "react";
import { Database } from "lucide-react";

interface DbInfoData {
  target: string;
  host: string;
  port: string;
  schema: string;
  ambiente: string;
  isRemote: boolean;
  isTest: boolean;
}

const stylesByTarget: Record<string, { bg: string; text: string; border: string; icon: string; label: string }> = {
  "local-prod": {
    bg: "bg-success-50",
    text: "text-success-700",
    border: "border-success-200",
    icon: "🟢",
    label: "Local Prod",
  },
  "local-test": {
    bg: "bg-warning-50",
    text: "text-warning-700",
    border: "border-warning-200",
    icon: "🟡",
    label: "Local Test",
  },
  "remote-prod": {
    bg: "bg-accent-red-400/10",
    text: "text-accent-red-500",
    border: "border-accent-red-400/30",
    icon: "🔴",
    label: "REMOTO",
  },
};

const DbBadge: React.FC = () => {
  const [dbInfo, setDbInfo] = useState<DbInfoData | null>(null);

  useEffect(() => {
    // Apenas em desenvolvimento — em produção a API retorna 404
    if (process.env.NODE_ENV === "production") return;

    fetch("/api/db-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setDbInfo(data))
      .catch(() => setDbInfo(null));
  }, []);

  if (!dbInfo) return null;

  const style = stylesByTarget[dbInfo.target] || stylesByTarget["local-prod"]!;

  return (
    <div
      className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${style.bg} ${style.border} text-[11px] font-medium ${style.text}`}
      title={`Host: ${dbInfo.host}:${dbInfo.port}\nSchema: ${dbInfo.schema}\nAmbiente: ${dbInfo.ambiente}`}
    >
      <Database className="w-3 h-3" />
      <span>
        {style.icon} {style.label}
      </span>
    </div>
  );
};

export default DbBadge;