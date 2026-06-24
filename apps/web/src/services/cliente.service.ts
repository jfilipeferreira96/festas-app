import prisma from "@festas/db";

/** Input para criar/sincronizar aniversariantes (filhos) de um cliente. */
export interface AniversarianteInput {
  nome: string;
  dataNascimento?: string;
  observacoes?: string;
}

interface CreateClienteData {
  nome: string;
  email: string;
  telefone: string;
  contribuinte?: string;
  codigoPostal?: string;
  observacao?: string;
  optOut?: boolean;
  aniversariantes?: AniversarianteInput[];
}

interface UpdateClienteData {
  nome?: string;
  email?: string;
  telefone?: string;
  contribuinte?: string;
  codigoPostal?: string;
  observacao?: string;
  optOut?: boolean;
  aniversariantes?: AniversarianteInput[];
}

/** Normaliza e filtra a lista de aniversariantes (remove entradas sem nome). */
function normalizarAniversariantes(
  input?: AniversarianteInput[]
): { nome: string; dataNascimento?: Date; observacoes?: string }[] {
  if (!input || input.length === 0) return [];
  return input
    .filter((a) => a && a.nome && a.nome.trim().length > 0)
    .map((a) => ({
      nome: a.nome.trim(),
      dataNascimento: a.dataNascimento ? new Date(a.dataNascimento) : undefined,
      observacoes: a.observacoes,
    }));
}

export const clienteService = {
  async list(filters?: { pesquisa?: string; page?: number; pageSize?: number }) {
    const where: Record<string, unknown> = {};
    if (filters?.pesquisa) {
      where.OR = [
        { nome: { contains: filters.pesquisa } },
        { email: { contains: filters.pesquisa } },
        { telefone: { contains: filters.pesquisa } },
        { contribuinte: { contains: filters.pesquisa } },
      ];
    }

    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.cliente.findMany({
        where,
        orderBy: { nome: "asc" },
        skip,
        take: pageSize,
        include: {
          aniversariantes: { orderBy: { nome: "asc" } },
        },
      }),
      prisma.cliente.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  async getById(id: string) {
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        aniversariantes: { orderBy: { nome: "asc" } },
        reservas: {
          take: 10,
          orderBy: { createdAt: "desc" },
          include: { local: true },
        },
      },
    });
    if (!cliente) throw new Error("NOT_FOUND");
    return cliente;
  },

  async create(data: CreateClienteData) {
    if (!data.nome) throw new Error("NOME_REQUIRED");
    if (!data.email) throw new Error("EMAIL_REQUIRED");
    if (!data.telefone) throw new Error("TELEFONE_REQUIRED");

    // Check for existing email
    const existingEmail = await prisma.cliente.findFirst({
      where: { email: data.email },
    });
    if (existingEmail) throw new Error("EMAIL_ALREADY_EXISTS");

    // Check for existing telefone
    const existingTel = await prisma.cliente.findFirst({
      where: { telefone: data.telefone },
    });
    if (existingTel) throw new Error("TELEFONE_ALREADY_EXISTS");

    const filhos = normalizarAniversariantes(data.aniversariantes);

    return prisma.cliente.create({
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        contribuinte: data.contribuinte,
        codigoPostal: data.codigoPostal,
        observacao: data.observacao,
        optOut: data.optOut || false,
        ...(filhos.length > 0
          ? { aniversariantes: { create: filhos } }
          : {}),
      },
      include: { aniversariantes: { orderBy: { nome: "asc" } } },
    });
  },

  async update(id: string, data: UpdateClienteData) {
    await this.getById(id);

    if (data.email) {
      const existing = await prisma.cliente.findFirst({
        where: { email: data.email, NOT: { id } },
      });
      if (existing) throw new Error("EMAIL_ALREADY_EXISTS");
    }

    if (data.telefone) {
      const existing = await prisma.cliente.findFirst({
        where: { telefone: data.telefone, NOT: { id } },
      });
      if (existing) throw new Error("TELEFONE_ALREADY_EXISTS");
    }

    // Separar dados do cliente dos filhos (não podem ir em prisma.update directo)
    const { aniversariantes, ...clienteData } = data;

    // Se vieram filhos, sincroniza (substitui todos)
    if (aniversariantes !== undefined) {
      const filhos = normalizarAniversariantes(aniversariantes);
      await prisma.aniversariante.deleteMany({ where: { clienteId: id } });
      if (filhos.length > 0) {
        await prisma.aniversariante.createMany({
          data: filhos.map((f) => ({ ...f, clienteId: id })),
        });
      }
    }

    return prisma.cliente.update({
      where: { id },
      data: clienteData,
      include: { aniversariantes: { orderBy: { nome: "asc" } } },
    });
  },

  async delete(id: string) {
    await this.getById(id);
    return prisma.cliente.delete({ where: { id } });
  },

  async search(query: string) {
    return prisma.cliente.findMany({
      where: {
        OR: [
          { nome: { contains: query } },
          { email: { contains: query } },
          { telefone: { contains: query } },
          { contribuinte: { contains: query } },
        ],
      },
      take: 10,
      orderBy: { nome: "asc" },
      include: {
        aniversariantes: { orderBy: { nome: "asc" } },
      },
    });
  },
};
