import prisma from "@festas/db";
import type { CriarExcecaoCalendarioDTO } from "@saas/shared-types";

/**
 * Normaliza uma data para meia-noite UTC (ignora horas/minutos).
 */
function normalizarData(data: Date): Date {
  return new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
}

export const excecaoCalendarioService = {
  async list() {
    return prisma.excecaoCalendario.findMany({
      orderBy: { data: "asc" },
    });
  },

  async getById(id: string) {
    const excecao = await prisma.excecaoCalendario.findUnique({ where: { id } });
    if (!excecao) throw new Error("NOT_FOUND");
    return excecao;
  },

  async getByData(data: Date) {
    return prisma.excecaoCalendario.findUnique({ where: { data: normalizarData(data) } });
  },

  async create(data: CriarExcecaoCalendarioDTO) {
    const dataNormalizada = normalizarData(new Date(data.data));
    try {
      return await prisma.excecaoCalendario.create({
        data: {
          data: dataNormalizada,
          tipo: data.tipo,
          nome: data.nome,
          afectaPreco: data.afectaPreco ?? (data.tipo === "FERIADO"),
          bloqueiaReserva: data.bloqueiaReserva ?? (data.tipo === "BLOQUEADO"),
          recorrenciaAnual: data.recorrenciaAnual ?? false,
        },
      });
    } catch {
      throw new Error("ALREADY_EXISTS");
    }
  },

  async update(id: string, data: Partial<CriarExcecaoCalendarioDTO>) {
    const existing = await this.getById(id);
    return prisma.excecaoCalendario.update({
      where: { id },
      data: {
        ...(data.data !== undefined && { data: normalizarData(new Date(data.data)) }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.nome !== undefined && { nome: data.nome }),
        ...(data.afectaPreco !== undefined && { afectaPreco: data.afectaPreco }),
        ...(data.bloqueiaReserva !== undefined && { bloqueiaReserva: data.bloqueiaReserva }),
        ...(data.recorrenciaAnual !== undefined && { recorrenciaAnual: data.recorrenciaAnual }),
      },
    });
  },

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await prisma.excecaoCalendario.delete({ where: { id } });
  },

  /**
   * Verifica se uma data é feriado (afecta preço = tarifa fim-de-semana).
   * Considera recorrência anual (compara apenas mês/dia).
   */
  async isFeriado(data: Date): Promise<boolean> {
    const normalizada = normalizarData(data);
    // Procura exacta na data OU recorrência anual (mesmo mês/dia)
    const candidatas = await prisma.excecaoCalendario.findMany({
      where: {
        OR: [
          { data: normalizada },
          { recorrenciaAnual: true },
        ],
        afectaPreco: true,
      },
    });

    return candidatas.some((e) => {
      if (e.recorrenciaAnual) {
        return (
          e.data.getUTCMonth() === normalizada.getUTCMonth() &&
          e.data.getUTCDate() === normalizada.getUTCDate()
        );
      }
      return e.data.getTime() === normalizada.getTime();
    });
  },

  /**
   * Verifica se uma data está bloqueada para criar festas.
   * Considera recorrência anual.
   */
  async isBloqueado(data: Date): Promise<boolean> {
    const normalizada = normalizarData(data);
    const candidatas = await prisma.excecaoCalendario.findMany({
      where: {
        OR: [
          { data: normalizada },
          { recorrenciaAnual: true },
        ],
        bloqueiaReserva: true,
      },
    });

    return candidatas.some((e) => {
      if (e.recorrenciaAnual) {
        return (
          e.data.getUTCMonth() === normalizada.getUTCMonth() &&
          e.data.getUTCDate() === normalizada.getUTCDate()
        );
      }
      return e.data.getTime() === normalizada.getTime();
    });
  },
  /**
   * Importa feriados nacionais de Portugal para um ano específico,
   * usando a API Nager.Date. Apenas cria feriados que ainda não existem.
   * @returns { criados: number; ignorados: number; total: number }
   */
  async importarFeriados(ano: number): Promise<{ criados: number; ignorados: number; total: number }> {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${ano}/PT`);
    if (!response.ok) {
      throw new Error("FERIADOS_API_ERROR");
    }
    const feriados: Array<{
      date: string;
      localName: string;
      name: string;
      countryCode: string;
      fixed: boolean;
      global: boolean;
      counties: string[] | null;
      launchYear: number | null;
      types: string[] | null;
    }> = await response.json();

    // Apenas feriados globais (nacionais), sem dependência regional
    const nacionais = feriados.filter((f) => f.global !== false);

    let criados = 0;
    let ignorados = 0;

    for (const feriado of nacionais) {
      const dataNormalizada = normalizarData(new Date(feriado.date));

      // Verifica se já existe (procura exacta ou recorrência anual mesmo mês/dia)
      const existente = await prisma.excecaoCalendario.findFirst({
        where: {
          OR: [
            { data: dataNormalizada },
            { recorrenciaAnual: true },
          ],
        },
      });

      const jaExiste = existente?.some((e) => {
        if (e.recorrenciaAnual) {
          return (
            e.data.getUTCMonth() === dataNormalizada.getUTCMonth() &&
            e.data.getUTCDate() === dataNormalizada.getUTCDate()
          );
        }
        return e.data.getTime() === dataNormalizada.getTime();
      });

      if (jaExiste) {
        ignorados++;
        continue;
      }

      // Feriados com data fixa usam recorrência anual
      const recorrenciaAnual = feriado.fixed;

      try {
        await prisma.excecaoCalendario.create({
          data: {
            data: dataNormalizada,
            tipo: "FERIADO",
            nome: feriado.localName,
            afectaPreco: true,
            bloqueiaReserva: false,
            recorrenciaAnual,
          },
        });
        criados++;
      } catch {
        // Se falhar (duplicate), conta como ignorado
        ignorados++;
      }
    }

    return { criados, ignorados, total: nacionais.length };
  },
};
