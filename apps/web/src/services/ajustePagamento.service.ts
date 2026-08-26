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

const TIPOS_VALIDOS = ["ACRESCIMO", "DESCONTO"] as const;

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

  async remove(id: string) {
    const ajuste = await prisma.ajustePagamento.findUnique({ where: { id } });
    if (!ajuste) throw new Error("NOT_FOUND");

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
