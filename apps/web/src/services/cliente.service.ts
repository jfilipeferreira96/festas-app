import prisma from "@festas/db";

interface CreateClienteData {
  nome: string;
  email: string;
  telefone: string;
  contribuinte?: string;
  codigoPostal?: string;
  observacao?: string;
  optOut?: boolean;
}

interface UpdateClienteData {
  nome?: string;
  email?: string;
  telefone?: string;
  contribuinte?: string;
  codigoPostal?: string;
  observacao?: string;
  optOut?: boolean;
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

    return prisma.cliente.create({
      data: {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        contribuinte: data.contribuinte,
        codigoPostal: data.codigoPostal,
        observacao: data.observacao,
        optOut: data.optOut || false,
      },
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

    return prisma.cliente.update({
      where: { id },
      data,
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