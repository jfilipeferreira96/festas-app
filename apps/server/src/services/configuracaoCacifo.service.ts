import prisma from "@festas/db";

export const configuracaoCacifoService = {
  async getConfig() {
    let config = await prisma.configuracaoCacifo.findFirst({
      include: { cacifos: { orderBy: { numero: "asc" } } },
    });

    // Auto-initialize with 200 default lockers if no config exists
    if (!config) {
      config = await this.inicializar();
    }

    return config;
  },

  async inicializar(totalCacifos = 200) {
    // Check if config already exists
    const existing = await prisma.configuracaoCacifo.findFirst();
    if (existing) throw new Error("CONFIG_ALREADY_EXISTS");

    return prisma.configuracaoCacifo.create({
      data: {
        totalCacifos,
        cacifos: {
          create: Array.from({ length: totalCacifos }, (_, i) => ({
            numero: i + 1,
            estado: "LIVRE",
          })),
        },
      },
      include: { cacifos: { orderBy: { numero: "asc" } } },
    });
  },

  async updateConfig(data: { totalCacifos: number; nomes?: Record<number, string> }) {
    let config = await prisma.configuracaoCacifo.findFirst();
    if (!config) {
      config = await this.inicializar(data.totalCacifos);
      return prisma.configuracaoCacifo.findUnique({
        where: { id: config.id },
        include: { cacifos: { orderBy: { numero: "asc" } } },
      });
    }

    const currentTotal = config.totalCacifos;
    const newTotal = data.totalCacifos;

    await prisma.$transaction(async (tx) => {
      // Update config total
      await tx.configuracaoCacifo.update({
        where: { id: config!.id },
        data: { totalCacifos: newTotal },
      });

      if (newTotal > currentTotal) {
        // Add new cacifos
        await tx.cacifo.createMany({
          data: Array.from({ length: newTotal - currentTotal }, (_, i) => ({
            numero: currentTotal + i + 1,
            estado: "LIVRE",
            configuracaoId: config!.id,
          })),
        });
      } else if (newTotal < currentTotal) {
        // Only remove LIVRE cacifos that are beyond the new total
        const cacifosToRemove = await tx.cacifo.findMany({
          where: {
            configuracaoId: config!.id,
            numero: { gt: newTotal },
            estado: "LIVRE",
          },
        });

        if (cacifosToRemove.length > 0) {
          await tx.cacifo.deleteMany({
            where: {
              id: { in: cacifosToRemove.map((c) => c.id) },
            },
          });
        }

        // Check if there are occupied cacifos beyond the new total
        const occupiedBeyond = await tx.cacifo.count({
          where: {
            configuracaoId: config!.id,
            numero: { gt: newTotal },
            estado: { in: ["OCUPADO", "RESERVADO"] },
          },
        });

        if (occupiedBeyond > 0) {
          throw new Error("CANNOT_REDUCE_OCCUPIED");
        }
      }

      // Update names if provided
      if (data.nomes) {
        for (const [numeroStr, nome] of Object.entries(data.nomes)) {
          const numero = parseInt(numeroStr, 10);
          if (numero >= 1 && numero <= newTotal) {
            await tx.cacifo.updateMany({
              where: { configuracaoId: config!.id, numero },
              data: { nome: nome || null },
            });
          }
        }
      }
    });

    return prisma.configuracaoCacifo.findUnique({
      where: { id: config.id },
      include: { cacifos: { orderBy: { numero: "asc" } } },
    });
  },
};