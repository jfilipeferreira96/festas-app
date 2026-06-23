import prisma from "@festas/db";

export const dashboardService = {
  async getKPIs() {
    const hoje = new Date();
    const hojeStart = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const hojeEnd = new Date(hojeStart);
    hojeEnd.setDate(hojeEnd.getDate() + 1);

    const [
      festasHoje,
      aComecar,
      aTerminar,
      cacifosOcupados,
      cacifosReservados,
    ] = await Promise.all([
      // Festas de hoje (reservas confirmadas ou em curso)
      prisma.reserva.count({
        where: {
          data: { gte: hojeStart, lt: hojeEnd },
          estado: { in: ["CONFIRMADO", "EM_CURSO"] },
        },
      }),

      // A começar (iniciadas nas últimas 60 min)
      prisma.reserva.count({
        where: {
          estado: "EM_CURSO",
          inicioEm: {
            gte: new Date(Date.now() - 60 * 60000),
            lte: new Date(),
          },
        },
      }),

      // A terminar (fim previsto nas próximas 60 min)
      prisma.reserva.count({
        where: {
          estado: "EM_CURSO",
          fimPrevisto: {
            gte: new Date(),
            lte: new Date(Date.now() + 60 * 60000),
          },
        },
      }),

      // Cacifos ocupados
      prisma.cacifo.count({
        where: { estado: "OCUPADO" },
      }),

      // Cacifos reservados
      prisma.cacifo.count({
        where: { estado: "RESERVADO" },
      }),
    ]);

    const [totalCacifos, criancasBreakdown, receitasHoje] = await Promise.all([
      prisma.cacifo.count(),
      this.getTotalCriancasNoParque(),
      this.getReceitasHoje(),
    ]);

    return {
      festasHoje,
      aComecar,
      aTerminar,
      cacifosOcupados,
      cacifosReservados,
      cacifosTotal: totalCacifos,
      totalCriancasNoParque: criancasBreakdown.total,
      criancasFestas: criancasBreakdown.festas,
      criancasEntradas: criancasBreakdown.entradas,
      receitasHoje,
    };
  },

  /**
   * Total de crianças atualmente no parque (separado por festas e entradas):
   * - soma de numCriancas das reservas EM_CURSO
   * - soma do nº de crianças (JSON) das entradas livres ATIVA
   */
  async getTotalCriancasNoParque(): Promise<{ total: number; festas: number; entradas: number }> {
    const [reservasEmCurso, entradasAtivas] = await Promise.all([
      prisma.reserva.findMany({
        where: { estado: "EM_CURSO" },
        select: { numCriancas: true },
      }),
      prisma.entradaLivre.findMany({
        where: { estado: "ATIVA" },
        select: { criancas: true },
      }),
    ]);

    const criancasFestas = reservasEmCurso.reduce(
      (sum: number, r: { numCriancas: number | null }) => sum + (r.numCriancas ?? 0),
      0
    );

    const criancasEntradas = entradasAtivas.reduce((sum: number, e: { criancas: unknown }) => {
      const lista = e.criancas;
      return sum + (Array.isArray(lista) ? lista.length : 0);
    }, 0);

    return { total: criancasFestas + criancasEntradas, festas: criancasFestas, entradas: criancasEntradas };
  },

  /**
   * Receitas do dia agrupadas por método de pagamento.
   * Contabiliza reservas e entradas livres pagas hoje.
   */
  async getReceitasHoje(): Promise<Record<string, number>> {
    const hoje = new Date();
    const hojeStart = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const hojeEnd = new Date(hojeStart);
    hojeEnd.setDate(hojeEnd.getDate() + 1);

    const [reservasHoje, entradasHoje] = await Promise.all([
      prisma.reserva.findMany({
        where: {
          data: { gte: hojeStart, lt: hojeEnd },
          pago: true,
        },
        select: { metodoPagamento: true, valorPago: true, metodoPagamento2: true, valorPago2: true },
      }),
      prisma.entradaLivre.findMany({
        where: {
          inicioEm: { gte: hojeStart, lt: hojeEnd },
          estado: { in: ["ATIVA", "CONCLUIDA"] },
          pago: true,
        },
        select: { metodoPagamento: true, custoTotal: true, metodoPagamento2: true, valorPago2: true },
      }),
    ]);

    const receitas: Record<string, number> = {};

    const somar = (metodo: string | null | undefined, valor: unknown) => {
      const num = valor == null ? 0 : Number(valor);
      if (!metodo || num <= 0) return;
      receitas[metodo] = (receitas[metodo] ?? 0) + num;
    };

    for (const r of reservasHoje) {
      somar(r.metodoPagamento, r.valorPago);
      somar(r.metodoPagamento2, r.valorPago2);
    }
    for (const e of entradasHoje) {
      somar(e.metodoPagamento, e.custoTotal);
      somar(e.metodoPagamento2, e.valorPago2);
    }

    return receitas;
  },

  async getFestasEmCurso() {
    return prisma.reserva.findMany({
      where: { estado: "EM_CURSO" },
      include: {
        local: true,
        aniversariantes: { include: { aniversariante: true } },
        cliente: true,
        monitores: { include: { monitor: true } },
        cacifos: true,
        etapas: { include: { etapa: true }, orderBy: { etapa: { ordem: "asc" } } },
        participantes: { include: { cacifo: true } },
      },
      orderBy: { inicioEm: "asc" },
    });
  },

  async getProximasFestas() {
    const agora = new Date();
    const hojeStart = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const hojeEnd = new Date(hojeStart);
    hojeEnd.setDate(hojeEnd.getDate() + 1);
    const horarioAtual = agora.toTimeString().slice(0, 5);

    return prisma.reserva.findMany({
      where: {
        data: { gte: hojeStart, lt: hojeEnd },
        horario: { gt: horarioAtual },
        estado: { in: ["CONFIRMADO"] },
      },
      include: { local: true, aniversariantes: { include: { aniversariante: true } } },
      orderBy: { horario: "asc" },
      take: 5,
    });
  },

  async getAniversarioEmBreve() {
    const agora = new Date();
    const hojeStart = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const hojeEnd = new Date(hojeStart);
    hojeEnd.setDate(hojeEnd.getDate() + 1);
    const horarioAtual = agora.toTimeString().slice(0, 5);

    const reserva = await prisma.reserva.findFirst({
      where: {
        data: { gte: hojeStart, lt: hojeEnd },
        horario: { gt: horarioAtual },
        estado: { in: ["CONFIRMADO"] },
      },
      include: { local: true, aniversariantes: { include: { aniversariante: true } } },
      orderBy: { horario: "asc" },
    });

    return reserva;
  },
};