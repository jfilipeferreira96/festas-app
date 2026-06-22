import { differenceInYears } from "date-fns";
import prisma from "@festas/db";

/**
 * Serviço de Festas a Acabar — usado pela conta FESTAS_ACABAR.
 * Mostra as festas EM_CURSO, ordenadas por hora de saída (fimPrevisto).
 */
export const festasAcabarService = {
  async getFestas() {
    const festas = await prisma.reserva.findMany({
      where: { estado: "EM_CURSO" },
      include: {
        local: true,
        aniversariantes: { include: { aniversariante: true } },
        cacifos: true,
      },
      orderBy: { fimPrevisto: "asc" },
    });

    return festas.map((r) => {
      const nomesAniv = r.aniversariantes
        .map((a) => a.aniversariante?.nome)
        .filter(Boolean)
        .join(", ");

      // Calcular idade do primeiro aniversariante com dataNascimento
      const primeiroAniv = r.aniversariantes.find((a) => a.aniversariante?.dataNascimento);
      const idadeAniversariante =
        primeiroAniv?.aniversariante?.dataNascimento
          ? differenceInYears(new Date(r.data ?? new Date()), new Date(primeiroAniv.aniversariante.dataNascimento))
          : null;

      return {
        id: r.id,
        nomeFesta: nomesAniv || "—",
        cor: r.cor,
        idadeAniversariante,
        numCriancas: r.numCriancas,
        inicioEm: r.inicioEm?.toISOString() ?? null,
        fimPrevisto: r.fimPrevisto?.toISOString() ?? null,
        localNome: r.local?.nome ?? "—",
        observacoesBrindes: r.observacoesBrindes ?? "",
        observacoesBrindesPais: r.observacoesBrindesPais ?? "",
        observacoesLesoes: r.observacoesLesoes ?? "",
      };
    });
  },

  async atualizarObservacoes(
    reservaId: string,
    data: { observacoesLesoes?: string; observacoesBrindes?: string; observacoesBrindesPais?: string }
  ) {
    const reserva = await prisma.reserva.findUnique({ where: { id: reservaId } });
    if (!reserva) throw new Error("NOT_FOUND");

    return prisma.reserva.update({
      where: { id: reservaId },
      data: {
        ...(data.observacoesLesoes !== undefined && { observacoesLesoes: data.observacoesLesoes }),
        ...(data.observacoesBrindes !== undefined && { observacoesBrindes: data.observacoesBrindes }),
        ...(data.observacoesBrindesPais !== undefined && { observacoesBrindesPais: data.observacoesBrindesPais }),
      },
    });
  },
};
