import prisma from "@festas/db";

export interface FechoDiaResultado {
  data: string;
  festasFechadas: number;
  cacifosLibertados: number;
}

/**
 * Fecho automático de fim de dia (21/09/2026):
 * - Festas do dia em RESERVA/CONFIRMADO/EM_CURSO → CONCLUIDA;
 * - Cacifos atribuídos a essas festas → LIVRE, com nome/crianças/notas limpos
 *   (o histórico de ocupações preserva-se no próprio cacifo).
 * No dia seguinte o parque começa limpo.
 */
export const fechoDiaService = {
  async fecharDia(dataAlvo?: string): Promise<FechoDiaResultado> {
    const base = dataAlvo ? new Date(`${dataAlvo}T00:00:00`) : new Date();
    const inicio = new Date(base);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(inicio);
    fim.setDate(fim.getDate() + 1);
    const dataISO = inicio.toISOString().slice(0, 10);

    const festas = await prisma.reserva.findMany({
      where: {
        data: { gte: inicio, lt: fim },
        estado: { in: ["RESERVA", "CONFIRMADO", "EM_CURSO"] },
      },
      select: { id: true },
    });
    const ids = festas.map((f) => f.id);

    if (ids.length === 0) {
      return { data: dataISO, festasFechadas: 0, cacifosLibertados: 0 };
    }

    const [festasFechadas, cacifosLibertados] = await prisma.$transaction([
      prisma.reserva.updateMany({
        where: { id: { in: ids } },
        data: { estado: "CONCLUIDA" },
      }),
      prisma.cacifo.updateMany({
        where: { reservaId: { in: ids } },
        data: { estado: "LIVRE", reservaId: null, nome: null, criancas: null, notas: null },
      }),
    ]);

    return {
      data: dataISO,
      festasFechadas: festasFechadas.count,
      cacifosLibertados: cacifosLibertados.count,
    };
  },
};
