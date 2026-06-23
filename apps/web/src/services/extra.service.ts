import prisma from "@festas/db";

interface CreateExtraData {
  nome: string;
  descricao?: string;
  precoUnitario: number;
  icone?: string;
  categoria?: "MENU" | "EXTRA";
  subcategoria?: string;
  requerTexto?: boolean;
  activo?: boolean;
  locaisIds?: string[];
}

interface UpdateExtraData {
  nome?: string;
  descricao?: string;
  precoUnitario?: number;
  icone?: string;
  categoria?: "MENU" | "EXTRA";
  subcategoria?: string;
  requerTexto?: boolean;
  activo?: boolean;
  locaisIds?: string[];
}

export const extraService = {
  async list() {
    return prisma.extra.findMany({
      orderBy: { nome: "asc" },
      include: { locais: { include: { local: true } } },
    });
  },

  /** Retorna todas as subcategorias distintas já usadas nos extras */
  async getSubcategorias(): Promise<string[]> {
    const results = await prisma.extra.findMany({
      where: { subcategoria: { not: null } },
      select: { subcategoria: true },
      distinct: ["subcategoria"],
    });
    const subcategorias: string[] = results
      .map((r: { subcategoria: string | null }) => r.subcategoria)
      .filter((s: string | null): s is string => Boolean(s));
    return subcategorias.sort((a, b) => a.localeCompare(b, "pt"));
  },

  async getById(id: string) {
    const extra = await prisma.extra.findUnique({
      where: { id },
      include: { locais: { include: { local: true } } },
    });
    if (!extra) throw new Error("NOT_FOUND");
    return extra;
  },

  async create(data: CreateExtraData) {
    if (!data.nome) throw new Error("NOME_REQUIRED");
    if (data.precoUnitario === undefined || data.precoUnitario < 0) throw new Error("PRICE_REQUIRED");

    return prisma.extra.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        precoUnitario: data.precoUnitario,
        icone: data.icone,
        categoria: data.categoria ?? "EXTRA",
        subcategoria: data.subcategoria,
        requerTexto: data.requerTexto ?? false,
        activo: data.activo !== undefined ? data.activo : true,
        locais: data.locaisIds
          ? { create: data.locaisIds.map((localId) => ({ localId })) }
          : undefined,
      },
      include: { locais: { include: { local: true } } },
    });
  },

  async update(id: string, data: UpdateExtraData) {
    await this.getById(id);

    if (data.locaisIds) {
      await prisma.extraLocal.deleteMany({ where: { extraId: id } });
    }

    return prisma.extra.update({
      where: { id },
      data: {
        nome: data.nome,
        descricao: data.descricao,
        precoUnitario: data.precoUnitario,
        icone: data.icone,
        categoria: data.categoria,
        subcategoria: data.subcategoria,
        requerTexto: data.requerTexto,
        activo: data.activo,
        locais: data.locaisIds
          ? { create: data.locaisIds.map((localId) => ({ localId })) }
          : undefined,
      },
      include: { locais: { include: { local: true } } },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    await prisma.extraLocal.deleteMany({ where: { extraId: id } });
    return prisma.extra.delete({ where: { id } });
  },
};
