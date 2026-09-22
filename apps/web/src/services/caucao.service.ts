import prisma from "@festas/db";

/**
 * Cauções - vista consolidada de todas as cauções das festas.
 * Fonte: Reserva.valorCaucao / Reserva.caucao / Reserva.metodoCaucao.
 * Serve a página /caucoes (saber o que está pago e o que está por pagar).
 */
export const caucaoService = {
  async listarCaucoes(filtros?: {
    /** "PAGA" | "PAGA_NO_DIA" | "NAO_PAGA" - estado da caução */
    estadoCaucao?: string;
    dataInicio?: string;
    dataFim?: string;
    pesquisa?: string;
  }) {
    const where: Record<string, unknown> = {
      estado: { not: "CANCELADA" },
      OR: [{ valorCaucao: { not: null } }, { caucao: { in: ["PAGA", "PAGA_NO_DIA"] } }],
    };

    if (filtros?.estadoCaucao) {
      where.caucao = filtros.estadoCaucao;
    }

    // Intervalo de datas (mesmo padrão dos restantes serviços: ISO date string)
    if (filtros?.dataInicio || filtros?.dataFim) {
      const dateFilter: Record<string, Date> = {};
      if (filtros.dataInicio) dateFilter.gte = new Date(filtros.dataInicio + "T00:00:00.000Z");
      if (filtros.dataFim) dateFilter.lt = new Date(filtros.dataFim + "T00:00:00.000Z");
      where.data = dateFilter;
    }

    if (filtros?.pesquisa) {
      const termo = filtros.pesquisa.trim();
      where.OR = [
        ...(Array.isArray(where.OR) ? where.OR : []),
        { cliente: { nome: { contains: termo } } },
        { cliente: { telefone: { contains: termo } } },
      ];
    }

    const reservas = await prisma.reserva.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        salaLanche: { select: { id: true, nome: true } },
        aniversariantes: { include: { aniversariante: { select: { id: true, nome: true } } } },
      },
      orderBy: { data: "desc" },
    });

    return reservas.map((r) => ({
      id: r.id,
      data: r.data,
      horario: r.horario,
      estado: r.estado,
      caucao: r.caucao,
      valorCaucao: r.valorCaucao != null ? Number(r.valorCaucao) : null,
      metodoCaucao: r.metodoCaucao,
      valorTotal: r.valorTotal != null ? Number(r.valorTotal) : null,
      pago: r.pago,
      cliente: r.cliente,
      salaLanche: r.salaLanche,
      aniversariantes: r.aniversariantes,
    }));
  },
};
