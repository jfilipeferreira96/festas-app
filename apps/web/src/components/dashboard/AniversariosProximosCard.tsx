"use client";

import React from "react";
import Link from "next/link";
import { Cake, Phone, Plus } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { useAniversariosProximos } from "@/hooks/use-dashboard";
import type { AniversarioProximo } from "@/lib/api/dashboard";

interface AniversariosProximosCardProps {
  dias?: number;
}

export const AniversariosProximosCard = React.memo(function AniversariosProximosCard({
  dias = 30,
}: AniversariosProximosCardProps) {
  const { data: aniversarios, isLoading } = useAniversariosProximos(dias);
  const lista = (aniversarios ?? []).slice(0, 10);

  return (
    <div className="bg-surface rounded-[14px] p-5 shadow-card border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cake size={18} className="text-brand-500" />
          <h3 className="font-poppins text-base font-semibold text-text-primary">
            Aniversários próximos
          </h3>
        </div>
        <span className="text-xs text-text-muted">próximos {dias} dias</span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-text-muted py-6 text-center">
          Sem aniversários registados nos próximos {dias} dias.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="font-medium py-2 pr-3">Criança</th>
                <th className="font-medium py-2 px-3 whitespace-nowrap">Idade</th>
                <th className="font-medium py-2 px-3 whitespace-nowrap">Aniversário</th>
                <th className="font-medium py-2 px-3">Cliente</th>
                <th className="font-medium py-2 px-3 whitespace-nowrap">Contacto</th>
                <th className="font-medium py-2 px-3 text-center">Estado</th>
                <th className="font-medium py-2 pl-3 text-right">Acção</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => {
                const semReserva = !item.temReservaNoMes;
                const data = new Date(item.proximoAniversario);
                return (
                  <tr key={item.aniversariante.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <Cake size={14} className="text-brand-500 shrink-0" />
                        <span className="font-medium text-text-primary">{item.aniversariante.nome}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                      {item.idadeQueFaz != null ? `${item.idadeQueFaz} anos` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap capitalize">
                      {format(data, "dd MMM", { locale: pt })}
                    </td>
                    <td className="py-2.5 px-3 text-text-secondary">{item.cliente.nome}</td>
                    <td className="py-2.5 px-3 text-text-secondary whitespace-nowrap">
                      {item.cliente.telefone || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {semReserva ? (
                        <span className="inline-block text-[11px] font-medium text-accent-orange-700 bg-accent-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          Sem reserva
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          Reservado
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {semReserva && (
                          <Link
                            href={`/reservas?cliente=${item.cliente.id}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
                            title="Criar reserva"
                          >
                            <Plus size={13} />
                            Reserva
                          </Link>
                        )}
                        {item.cliente.telefone && (
                          <a
                            href={`tel:${item.cliente.telefone}`}
                            className="p-1.5 rounded-lg text-text-muted hover:text-brand-500 hover:bg-brand-50 transition-colors"
                            title={`Ligar ${item.cliente.telefone}`}
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lista.length > 0 && (
        <div className="mt-4 text-center">
          <Link
            href="/clientes"
            className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors"
          >
            Ver todos os clientes
          </Link>
        </div>
      )}
    </div>
  );
});

export default AniversariosProximosCard;
