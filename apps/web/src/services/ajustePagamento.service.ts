import prisma from "@festas/db";
import type { MetodoPagamento } from "@prisma/client";

interface SessionUser {
  id: string;
  name?: string;
}

interface CriarAjusteDTO {
  tipo: "ACRESCIMO" | "DESCONTO";
  valor: number;
  motivo: string;
  metodoPagamento?: MetodoPagamento;
  reservaId?: string;
  entradaLivreId?: string;
}

interface RedefinirPrecoDTO {
  modo: "TOTAL" | "POR_CRIANCA";
  /** Novo total absoluto (modo TOTAL) */
  valor?: number;
  /** Preço por criança (modo POR_CRIANCA) */
  precoPorCabeca?: number;
  motivo: string;
  reservaId?: string;
  entradaLivreId?: string;
}

const TIPOS_VALIDOS = ["ACRESCIMO", "DESCONTO"] as const;
const MODOS_REDEFINICAO = ["TOTAL", "POR_CRIANCA"] as const;

export const ajustePagamentoService = {
  async list(filtros: { reservaId?: string; entradaLivreId?: string }) {
    const where: Record<string, string> = {};
    if (filtros.reservaId) where.reservaId = filtros.reservaId;
    if (filtros.entradaLivreId) where.entradaLivreId = filtros.entradaLivreId;

    const ajustes = await prisma.ajustePagamento.findMany({
      where,
      include: { criadoPor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return ajustes.map((a) => ({
      ...a,
      valor: Number(a.valor),
      precoPorCabeca: a.precoPorCabeca != null ? Number(a.precoPorCabeca) : null,
    }));
  },

  async create(data: CriarAjusteDTO, user?: SessionUser) {
    if (!TIPOS_VALIDOS.includes(data.tipo)) throw new Error("TIPO_INVALIDO");
    if (typeof data.valor !== "number" || !(data.valor > 0)) throw new Error("VALOR_INVALIDO");
    if (!data.motivo || !data.motivo.trim()) throw new Error("MOTIVO_OBRIGATORIO");

    const temReserva = !!data.reservaId;
    const temEntrada = !!data.entradaLivreId;
    if (temReserva === temEntrada) throw new Error("ALVO_INVALIDO");

    const delta = data.tipo === "ACRESCIMO" ? data.valor : -data.valor;

    if (data.reservaId) {
      const reserva = await prisma.reserva.findUnique({ where: { id: data.reservaId } });
      if (!reserva) throw new Error("NOT_FOUND");
      const atual = Number(reserva.valorPago ?? 0);
      const novo = Math.round((atual + delta) * 100) / 100;
      if (novo < 0) throw new Error("VALOR_INVALIDO");
      await prisma.reserva.update({
        where: { id: data.reservaId },
        data: { valorPago: novo },
      });
    } else if (data.entradaLivreId) {
      const entrada = await prisma.entradaLivre.findUnique({ where: { id: data.entradaLivreId } });
      if (!entrada) throw new Error("NOT_FOUND");
      if (entrada.custoTotalFinal != null) {
        const novo = Math.round((Number(entrada.custoTotalFinal) + delta) * 100) / 100;
        if (novo < 0) throw new Error("VALOR_INVALIDO");
        await prisma.entradaLivre.update({
          where: { id: data.entradaLivreId },
          data: { custoTotalFinal: novo },
        });
      } else {
        const novo = Math.round((Number(entrada.custoTotal) + delta) * 100) / 100;
        if (novo < 0) throw new Error("VALOR_INVALIDO");
        await prisma.entradaLivre.update({
          where: { id: data.entradaLivreId },
          data: { custoTotal: novo },
        });
      }
    }

    return prisma.ajustePagamento.create({
      data: {
        tipo: data.tipo,
        valor: data.valor,
        motivo: data.motivo.trim(),
        metodoPagamento: data.metodoPagamento ?? null,
        reservaId: data.reservaId ?? null,
        entradaLivreId: data.entradaLivreId ?? null,
        criadoPorId: user?.id ?? null,
      },
      include: { criadoPor: { select: { id: true, name: true } } },
    });
  },

  /**
   * Redefine o preço final de uma festa ou entrada livre.
   * modo TOTAL: valor absoluto novo. modo POR_CRIANCA: precoPorCabeca × nº crianças.
   * Regista ajuste REDEFINICAO no histórico (não removível — não guardamos o valor anterior).
   */
  async redefinirPreco(data: RedefinirPrecoDTO, user?: SessionUser) {
    if (!MODOS_REDEFINICAO.includes(data.modo)) throw new Error("MODO_INVALIDO");
    if (!data.motivo || !data.motivo.trim()) throw new Error("MOTIVO_OBRIGATORIO");

    const temReserva = !!data.reservaId;
    const temEntrada = !!data.entradaLivreId;
    if (temReserva === temEntrada) throw new Error("ALVO_INVALIDO");

    let novoTotal = 0;
    let precoPorCabeca: number | null = null;

    if (data.modo === "TOTAL") {
      if (typeof data.valor !== "number" || !(data.valor > 0)) throw new Error("VALOR_INVALIDO");
      novoTotal = Math.round(data.valor * 100) / 100;
    } else {
      if (typeof data.precoPorCabeca !== "number" || !(data.precoPorCabeca > 0)) {
        throw new Error("VALOR_INVALIDO");
      }
      precoPorCabeca = data.precoPorCabeca;
    }

    if (data.reservaId) {
      const reserva = await prisma.reserva.findUnique({ where: { id: data.reservaId } });
      if (!reserva) throw new Error("NOT_FOUND");

      if (data.modo === "POR_CRIANCA") {
        const criancas = reserva.numCriancasConfirmadas ?? reserva.numCriancas;
        if (!criancas || criancas <= 0) throw new Error("CRIANCAS_INVALIDO");
        novoTotal = Math.round(precoPorCabeca! * criancas * 100) / 100;
      }

      await prisma.reserva.update({
        where: { id: data.reservaId },
        data: { valorPago: novoTotal },
      });
    } else if (data.entradaLivreId) {
      const entrada = await prisma.entradaLivre.findUnique({ where: { id: data.entradaLivreId } });
      if (!entrada) throw new Error("NOT_FOUND");

      if (data.modo === "POR_CRIANCA") {
        const criancas = Array.isArray(entrada.criancas) ? entrada.criancas.length : 0;
        if (criancas <= 0) throw new Error("CRIANCAS_INVALIDO");
        novoTotal = Math.round(precoPorCabeca! * criancas * 100) / 100;
      }

      const campo = entrada.custoTotalFinal != null ? "custoTotalFinal" : "custoTotal";
      await prisma.entradaLivre.update({
        where: { id: data.entradaLivreId },
        data: { [campo]: novoTotal },
      });
    }

    return prisma.ajustePagamento.create({
      data: {
        tipo: "REDEFINICAO",
        valor: novoTotal,
        modo: data.modo,
        precoPorCabeca,
        motivo: data.motivo.trim(),
        reservaId: data.reservaId ?? null,
        entradaLivreId: data.entradaLivreId ?? null,
        criadoPorId: user?.id ?? null,
      },
      include: { criadoPor: { select: { id: true, name: true } } },
    });
  },

  async remove(id: string) {
    const ajuste = await prisma.ajustePagamento.findUnique({ where: { id } });
    if (!ajuste) throw new Error("NOT_FOUND");
    if (ajuste.tipo === "REDEFINICAO") throw new Error("REDEFINICAO_NAO_REMOVIVEL");

    const delta = ajuste.tipo === "ACRESCIMO" ? -Number(ajuste.valor) : Number(ajuste.valor);

    if (ajuste.reservaId) {
      const reserva = await prisma.reserva.findUnique({ where: { id: ajuste.reservaId } });
      if (reserva) {
        const novo = Math.max(0, Math.round((Number(reserva.valorPago ?? 0) + delta) * 100) / 100);
        await prisma.reserva.update({
          where: { id: ajuste.reservaId },
          data: { valorPago: novo },
        });
      }
    } else if (ajuste.entradaLivreId) {
      const entrada = await prisma.entradaLivre.findUnique({ where: { id: ajuste.entradaLivreId } });
      if (entrada) {
        if (entrada.custoTotalFinal != null) {
          const novo = Math.max(0, Math.round((Number(entrada.custoTotalFinal) + delta) * 100) / 100);
          await prisma.entradaLivre.update({
            where: { id: ajuste.entradaLivreId },
            data: { custoTotalFinal: novo },
          });
        } else {
          const novo = Math.max(0, Math.round((Number(entrada.custoTotal) + delta) * 100) / 100);
          await prisma.entradaLivre.update({
            where: { id: ajuste.entradaLivreId },
            data: { custoTotal: novo },
          });
        }
      }
    }

    await prisma.ajustePagamento.delete({ where: { id } });
    return { ok: true };
  },
};
