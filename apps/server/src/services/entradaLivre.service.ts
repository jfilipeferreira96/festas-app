import prisma from "@festas/db";

interface CriancaInput {
  nome: string;
  idade?: number;
}

interface CriarEntradaLivreDTO {
  criancas: CriancaInput[];
  encarregadoNome: string;
  encarregadoTelefone: string;
  encarregadoEmail?: string;
  duracaoMinutos: number;
  localId: string;
  metodoPagamento?: string;
  pago?: boolean;
  cacifoId?: string;
  extrasIds?: string[];
  observacoes?: string;
  observacoesLesoes?: string;
}

export const entradaLivreService = {
  // ── Listar entradas livres ──────────────────────
  async list(filtros?: {
    estado?: string;
    localId?: string;
    data?: string;
    dataInicio?: string;
    dataFim?: string;
    pesquisa?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.localId) where.localId = filtros.localId;

    // Filtro por data específica (hoje, amanhã, etc.)
    if (filtros?.data) {
      const date = new Date(filtros.data + "T00:00:00.000Z");
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.inicioEm = { gte: date, lt: nextDay };
    }

    // Filtro por intervalo de datas
    if (!filtros?.data && (filtros?.dataInicio || filtros?.dataFim)) {
      const dateFilter: Record<string, Date> = {};
      if (filtros.dataInicio) dateFilter.gte = new Date(filtros.dataInicio + "T00:00:00.000Z");
      if (filtros.dataFim) dateFilter.lt = new Date(filtros.dataFim + "T00:00:00.000Z");
      where.inicioEm = dateFilter;
    }

    // Pesquisa por nome do encarregado ou nome das crianças (JSON field)
    if (filtros?.pesquisa) {
      const termo = filtros.pesquisa.trim();
      where.OR = [
        { encarregadoNome: { contains: termo, mode: "insensitive" } },
        { encarregadoTelefone: { contains: termo } },
      ];
    }

    const entradas = await prisma.entradaLivre.findMany({
      where,
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
      orderBy: { inicioEm: "desc" },
    });

    // Client-side filter for criança names (JSON field — Prisma can't search inside JSON easily)
    let resultado = entradas.map((e: any) => ({
      ...e,
      custoHora: Number(e.custoHora),
      custoTotal: Number(e.custoTotal),
      custoExcesso: e.custoExcesso ? Number(e.custoExcesso) : null,
      custoTotalFinal: e.custoTotalFinal ? Number(e.custoTotalFinal) : null,
    }));

    if (filtros?.pesquisa) {
      const termo = filtros.pesquisa.trim().toLowerCase();
      resultado = resultado.filter((e: any) => {
        const criancasNomes = Array.isArray(e.criancas)
          ? e.criancas.map((c: any) => c.nome || "").join(" ").toLowerCase()
          : "";
        return (
          criancasNomes.includes(termo) ||
          (e.encarregadoNome && e.encarregadoNome.toLowerCase().includes(termo)) ||
          (e.encarregadoTelefone && e.encarregadoTelefone.includes(termo))
        );
      });
    }

    return resultado;
  },

  // ── Obter por ID ────────────────────────────────
  async getById(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({
      where: { id },
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
    });
    if (!entrada) throw new Error("NOT_FOUND");
    
    // Convert Decimal fields to numbers
    return {
      ...entrada,
      custoHora: Number(entrada.custoHora),
      custoTotal: Number(entrada.custoTotal),
      custoExcesso: entrada.custoExcesso ? Number(entrada.custoExcesso) : null,
      custoTotalFinal: entrada.custoTotalFinal ? Number(entrada.custoTotalFinal) : null,
    };
  },

  // ── Criar entrada livre ─────────────────────────
  async create(data: CriarEntradaLivreDTO) {
    const { criancas, duracaoMinutos, localId, extrasIds, cacifoId, ...rest } = data;

    // Buscar configuração do local
    const config = await prisma.configuracaoEntradaLivre.findUnique({
      where: { localId },
    });
    if (!config) throw new Error("CONFIG_NOT_FOUND");

    const custoHora = Number(config.precoHora);
    const custoTotal = (custoHora / 60) * duracaoMinutos;

    const inicioEm = new Date();
    const fimPrevisto = new Date(inicioEm.getTime() + duracaoMinutos * 60 * 1000);

    // Criar entrada
    const entrada = await prisma.entradaLivre.create({
      data: {
        criancas,
        duracaoMinutos,
        custoHora: config.precoHora,
        custoTotal,
        inicioEm,
        fimPrevisto,
        localId,
        cacifoId: cacifoId || null,
        ...rest,
      },
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
    });

    // Associar extras
    if (extrasIds && extrasIds.length > 0) {
      await prisma.entradaLivreExtra.createMany({
        data: extrasIds.map((extraId) => ({
          entradaLivreId: entrada.id,
          extraId,
        })),
      });
    }

    // Marcar cacifo como ocupado
    if (cacifoId) {
      await prisma.cacifo.update({
        where: { id: cacifoId },
        data: {
          estado: "OCUPADO",
          criancas: criancas.map((c) => c.nome).join(", "),
        },
      });
    }

    return this.getById(entrada.id);
  },

  // ── Concluir entrada livre ──────────────────────
  async concluir(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");
    if (entrada.estado !== "ATIVA") throw new Error("NOT_ACTIVE");

    const fimReal = new Date();
    const inicioEm = new Date(entrada.inicioEm);
    const fimPrevisto = new Date(entrada.fimPrevisto);
    const duracaoRealMs = fimReal.getTime() - inicioEm.getTime();
    const duracaoPrevistaMs = fimPrevisto.getTime() - inicioEm.getTime();

    let excessoMinutos = 0;
    let custoExcesso = 0;

    if (duracaoRealMs > duracaoPrevistaMs) {
      excessoMinutos = Math.floor((duracaoRealMs - duracaoPrevistaMs) / (1000 * 60));
      const config = await prisma.configuracaoEntradaLivre.findUnique({
        where: { localId: entrada.localId },
      });
      const precoHoraExcesso = config ? Number(config.precoHoraExcesso) : Number(entrada.custoHora);
      custoExcesso = (precoHoraExcesso / 60) * excessoMinutos;
    }

    const custoTotalFinal = Number(entrada.custoTotal) + custoExcesso;

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data: {
        estado: "CONCLUIDA",
        fimReal,
        excessoMinutos,
        custoExcesso,
        custoTotalFinal,
      },
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
    });

    // Libertar cacifo
    if (entrada.cacifoId) {
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { estado: "LIVRE", criancas: null },
      });
    }

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Cancelar entrada livre ──────────────────────
  async cancelar(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");
    if (entrada.estado !== "ATIVA") throw new Error("NOT_ACTIVE");

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data: { estado: "CANCELADA" },
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
    });

    // Libertar cacifo
    if (entrada.cacifoId) {
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { estado: "LIVRE", criancas: null },
      });
    }

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Atualizar pagamento ─────────────────────────
  async atualizarPagamento(id: string, data: { pago?: boolean; pagoExcesso?: boolean; metodoPagamento?: string }) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data,
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
    });

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Atualizar entrada ───────────────────────────
  async atualizar(id: string, data: { observacoes?: string; observacoesLesoes?: string }) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");

    const updated = await prisma.entradaLivre.update({
      where: { id },
      data,
      include: {
        local: { select: { id: true, nome: true } },
        cacifo: { select: { id: true, numero: true, nome: true, estado: true } },
        extras: {
          include: { extra: { select: { id: true, nome: true, precoUnitario: true } } },
        },
      },
    });

    // Convert Decimal fields to numbers
    return {
      ...updated,
      custoHora: Number(updated.custoHora),
      custoTotal: Number(updated.custoTotal),
      custoExcesso: updated.custoExcesso ? Number(updated.custoExcesso) : null,
      custoTotalFinal: updated.custoTotalFinal ? Number(updated.custoTotalFinal) : null,
    };
  },

  // ── Eliminar entrada ────────────────────────────
  async eliminar(id: string) {
    const entrada = await prisma.entradaLivre.findUnique({ where: { id } });
    if (!entrada) throw new Error("NOT_FOUND");
    
    // Cannot delete active entries
    if (entrada.estado === "ATIVA") {
      throw new Error("CANNOT_DELETE_ACTIVE");
    }

    // Libertar cacifo se ocupado
    if (entrada.cacifoId) {
      await prisma.cacifo.update({
        where: { id: entrada.cacifoId },
        data: { estado: "LIVRE", criancas: null },
      });
    }

    await prisma.entradaLivre.delete({ where: { id } });
    return { message: "Eliminada com sucesso" };
  },

  // ── Contadores (ativas, hoje, etc.) ─────────────
  async getContadores() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const [ativas, concluidasHoje, totalHoje] = await Promise.all([
      prisma.entradaLivre.count({ where: { estado: "ATIVA" } }),
      prisma.entradaLivre.count({
        where: { estado: "CONCLUIDA", fimReal: { gte: hoje, lt: amanha } },
      }),
      prisma.entradaLivre.count({
        where: { inicioEm: { gte: hoje, lt: amanha } },
      }),
    ]);

    return { ativas, concluidasHoje, totalHoje };
  },

  // ── Configuração ────────────────────────────────
  async getConfiguracao(localId: string) {
    const config = await prisma.configuracaoEntradaLivre.findUnique({
      where: { localId },
      include: { local: { select: { id: true, nome: true } } },
    });
    if (!config) throw new Error("CONFIG_NOT_FOUND");
    
    // Convert Decimal fields to numbers
    return {
      ...config,
      precoHora: Number(config.precoHora),
      precoHoraExcesso: Number(config.precoHoraExcesso),
    };
  },

  async listarConfiguracoes() {
    const configs = await prisma.configuracaoEntradaLivre.findMany({
      include: { local: { select: { id: true, nome: true } } },
    });
    
    // Convert Decimal fields to numbers
    return configs.map((c: any) => ({
      ...c,
      precoHora: Number(c.precoHora),
      precoHoraExcesso: Number(c.precoHoraExcesso),
    }));
  },

  async upsertConfiguracao(data: { localId: string; precoHora: number; precoHoraExcesso: number; activo?: boolean }) {
    const config = await prisma.configuracaoEntradaLivre.upsert({
      where: { localId: data.localId },
      create: {
        precoHora: data.precoHora,
        precoHoraExcesso: data.precoHoraExcesso,
        localId: data.localId,
        activo: data.activo ?? true,
      },
      update: {
        precoHora: data.precoHora,
        precoHoraExcesso: data.precoHoraExcesso,
        activo: data.activo ?? true,
      },
      include: { local: { select: { id: true, nome: true } } },
    });
    
    // Convert Decimal fields to numbers
    return {
      ...config,
      precoHora: Number(config.precoHora),
      precoHoraExcesso: Number(config.precoHoraExcesso),
    };
  },
};