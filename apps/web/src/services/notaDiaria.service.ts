import prisma from "@festas/db";
import type { NotaDiaria, UpsertNotaDiariaDTO } from "@saas/shared-types";

/**
 * Serviço de Notas Diárias - usado pela vista MONITOR.
 * O ADMINISTRADOR escreve notas de manhã e tarde; o MONITOR lê-as.
 */
export const notaDiariaService = {
  async getByData(data: Date): Promise<NotaDiaria | null> {
    const inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate());

    const nota = await prisma.notaDiaria.findUnique({ where: { data: inicio } });
    if (!nota) return null;

    return {
      id: nota.id,
      data: nota.data.toISOString(),
      notasManha: nota.notasManha ?? undefined,
      notasTarde: nota.notasTarde ?? undefined,
    };
  },

  async upsert(data: UpsertNotaDiariaDTO): Promise<NotaDiaria> {
    const dia = new Date(data.data);
    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());

    const nota = await prisma.notaDiaria.upsert({
      where: { data: inicio },
      update: {
        ...(data.notasManha !== undefined && { notasManha: data.notasManha }),
        ...(data.notasTarde !== undefined && { notasTarde: data.notasTarde }),
      },
      create: {
        data: inicio,
        notasManha: data.notasManha,
        notasTarde: data.notasTarde,
      },
    });

    return {
      id: nota.id,
      data: nota.data.toISOString(),
      notasManha: nota.notasManha ?? undefined,
      notasTarde: nota.notasTarde ?? undefined,
    };
  },
};
