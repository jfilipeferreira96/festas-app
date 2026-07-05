import prisma from "@festas/db";

const SEGMENTO_ANIVERSARIANTES_NOME = "Aniversariantes";

export const newsletterService = {
  /**
   * Lista todos os segmentos com contagem de contactos.
   */
  async listSegmentos() {
    return prisma.segmento.findMany({
      include: {
        _count: { select: { contactos: true } },
      },
      orderBy: { nome: "asc" },
    });
  },

  /**
   * Sincroniza o segmento "Aniversariantes" com todos os clientes
   * que têm pelo menos um filho/aniversariante registado.
   *
   * Cria:
   * - O segmento "Aniversariantes" se não existir
   * - NewsletterContacto para cada cliente (se não existir)
   * - ContactoSegmento para associar cada contacto ao segmento
   *
   * @returns { criados: number; actualizados: number; total: number }
   */
  async sincronizarAniversariantes(): Promise<{ criados: number; actualizados: number; total: number }> {
    // 1. Encontrar ou criar o segmento "Aniversariantes"
    let segmento = await prisma.segmento.findFirst({
      where: { nome: SEGMENTO_ANIVERSARIANTES_NOME },
    });

    if (!segmento) {
      segmento = await prisma.segmento.create({
        data: {
          nome: SEGMENTO_ANIVERSARIANTES_NOME,
          descricao: "Clientes com crianças que já fizeram festas (aniversariantes)",
        },
      });
    }

    // 2. Obter todos os clientes distintos que têm aniversariantes
    const aniversariantes = await prisma.aniversariante.findMany({
      where: { dataNascimento: { not: null } },
      select: { clienteId: true },
      distinct: ["clienteId"],
    });

    const clienteIds = aniversariantes.map((a) => a.clienteId);
    let criados = 0;
    let actualizados = 0;

    for (const clienteId of clienteIds) {
      // Garantir que o cliente tem NewsletterContacto
      let contacto = await prisma.newsletterContacto.findUnique({
        where: { clienteId },
      });

      if (!contacto) {
        contacto = await prisma.newsletterContacto.create({
          data: { clienteId },
        });
        criados++;
      }

      // Verificar se já está no segmento
      const existe = await prisma.contactoSegmento.findUnique({
        where: {
          contactoId_segmentoId: {
            contactoId: contacto.id,
            segmentoId: segmento.id,
          },
        },
      });

      if (!existe) {
        await prisma.contactoSegmento.create({
          data: {
            contactoId: contacto.id,
            segmentoId: segmento.id,
          },
        });
        actualizados++;
      }
    }

    // Remover do segmento contactos cujo cliente já não tem aniversariantes
    const contactosNoSegmento = await prisma.contactoSegmento.findMany({
      where: { segmentoId: segmento.id },
      include: { contacto: true },
    });

    for (const cs of contactosNoSegmento) {
      const aindaTemAniversariante = await prisma.aniversariante.findFirst({
        where: {
          clienteId: cs.contacto.clienteId,
          dataNascimento: { not: null },
        },
      });

      if (!aindaTemAniversariante) {
        await prisma.contactoSegmento.delete({ where: { id: cs.id } });
      }
    }

    return { criados, actualizados, total: clienteIds.length };
  },
};
