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
      // Festas de hoje (todas exceto CANCELADA: CONFIRMADO, EM_CURSO, CONCLUIDA, RESERVA)
      prisma.reserva.count({
        where: {
          data: { gte: hojeStart, lt: hojeEnd },
          estado: { not: "CANCELADA" },
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
   * Fonte única: valorPago (festas) e custoTotalFinal (entradas).
   * Inclui pagamento dividido e excesso de tempo pago.
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
        select: {
          valorTotal: true,
          metodoPagamento: true,
          valorPago: true,
          metodoPagamento2: true,
          valorPago2: true,
          // Excesso de tempo (se já pago)
          custoExcesso: true,
          pagoExcesso: true,
        },
      }),
      prisma.entradaLivre.findMany({
        where: {
          inicioEm: { gte: hojeStart, lt: hojeEnd },
          estado: { in: ["ATIVA", "CONCLUIDA"] },
          pago: true,
        },
        select: {
          metodoPagamento: true,
          custoTotal: true,
          custoTotalFinal: true,
          metodoPagamento2: true,
          valorPago2: true,
        },
      }),
    ]);

    const receitas: Record<string, number> = {};

    const somar = (metodo: string | null | undefined, valor: unknown) => {
      const num = valor == null ? 0 : Number(valor);
      if (!metodo || num <= 0) return;
      receitas[metodo] = (receitas[metodo] ?? 0) + num;
    };

    for (const r of reservasHoje) {
      // Pagamento principal + dividido.
      // Regra: total = valorTotal ?? valorPago; pag.1 = valorPago (registos novos)
      // ou total - pag.2 (registos antigos, em que valorPago era o total).
      const totalFesta = Number(r.valorTotal ?? r.valorPago ?? 0);
      const recebido2 = Math.min(Number(r.valorPago2 ?? 0), totalFesta);
      const recebido1 = r.valorTotal != null ? Number(r.valorPago ?? 0) : totalFesta - recebido2;
      somar(r.metodoPagamento, recebido1);
      somar(r.metodoPagamento2, recebido2);
      // Excesso de tempo (só se foi pago)
      if (r.pagoExcesso) somar(r.metodoPagamento, r.custoExcesso);
    }
    for (const e of entradasHoje) {
      // Fonte única: custoTotalFinal inclui o excesso; fallback para custoTotal
      const valor = Number(e.custoTotalFinal ?? e.custoTotal ?? 0);
      // Pagamento dividido: método 2 = valorPago2, método 1 = resto
      const valorMetodo2 = Math.min(Number(e.valorPago2 ?? 0), valor);
      somar(e.metodoPagamento2, valorMetodo2);
      somar(e.metodoPagamento, valor - valorMetodo2);
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

  /**
   * Lista os aniversariantes (filhos de clientes) cujo próximo aniversário
   * ocorre nos próximos `dias` dias. Para cada um indica se o cliente já tem
   * reserva marcada para esse mês (para alertar "ainda sem reserva").
   * Ignora o ano - compara apenas mês/dia.
   */
  async getAniversariosProximos(dias = 30): Promise<
    {
      aniversariante: { id: string; nome: string; dataNascimento: Date | null };
      cliente: { id: string; nome: string; telefone: string; email: string | null };
      proximoAniversario: Date;
      idadeQueFaz: number | null;
      temReservaNoMes: boolean;
    }[]
  > {
    const todos = await prisma.aniversariante.findMany({
      where: { dataNascimento: { not: null } },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true, email: true } },
      },
    });

    const agora = new Date();
    const anoAtual = agora.getFullYear();
    const limite = new Date(agora);
    limite.setDate(limite.getDate() + dias);

    const resultados: {
      aniversariante: { id: string; nome: string; dataNascimento: Date | null };
      cliente: { id: string; nome: string; telefone: string; email: string | null };
      proximoAniversario: Date;
      idadeQueFaz: number | null;
      temReservaNoMes: boolean;
    }[] = [];

    for (const a of todos) {
      if (!a.dataNascimento) continue;
      const nasc = new Date(a.dataNascimento);

      // Próximo aniversário (mês/dia) - este ano ou no próximo
      let prox = new Date(anoAtual, nasc.getMonth(), nasc.getDate());
      // Se já passou hoje, usa o ano seguinte (mas dentro da janela pode incluir 29 fev etc.)
      const hojeZero = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
      if (prox < hojeZero) {
        prox = new Date(anoAtual + 1, nasc.getMonth(), nasc.getDate());
      }

      if (prox > limite) continue;

      // Idade que vai fazer
      let idade = prox.getFullYear() - nasc.getFullYear();
      const esteAnivAntesDoNasc =
        prox.getMonth() < nasc.getMonth() ||
        (prox.getMonth() === nasc.getMonth() && prox.getDate() < nasc.getDate());
      if (esteAnivAntesDoNasc) idade -= 1;

      resultados.push({
        aniversariante: { id: a.id, nome: a.nome, dataNascimento: a.dataNascimento },
        cliente: a.cliente,
        proximoAniversario: prox,
        idadeQueFaz: idade,
        temReservaNoMes: false, // preenchido em lote abaixo
      });
    }

    // Marcar quais clientes já têm reserva no mês do aniversário
    if (resultados.length > 0) {
      const reservas = await prisma.reserva.findMany({
        where: {
          estado: { notIn: ["CANCELADA"] },
          clienteId: { in: resultados.map((r) => r.cliente.id) },
        },
        select: { clienteId: true, data: true },
      });

      // Índice cliente -> conjunto de "ano-mes"
      const reservasPorCliente = new Map<string, Set<string>>();
      for (const r of reservas) {
        if (!r.data) continue;
        const d = new Date(r.data);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!reservasPorCliente.has(r.clienteId)) reservasPorCliente.set(r.clienteId, new Set());
        reservasPorCliente.get(r.clienteId)!.add(key);
      }

      for (const r of resultados) {
        const set = reservasPorCliente.get(r.cliente.id);
        r.temReservaNoMes = set
          ? set.has(`${r.proximoAniversario.getFullYear()}-${r.proximoAniversario.getMonth()}`)
          : false;
      }
    }

    // Ordenar pelo aniversário mais próximo
    resultados.sort(
      (a, b) => a.proximoAniversario.getTime() - b.proximoAniversario.getTime()
    );

    return resultados;
  },
};
