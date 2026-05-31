import prisma from "@festas/db";
import { auth } from "@festas/auth";
import type { FuncaoUtilizador } from "@saas/shared-types";

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  funcao: FuncaoUtilizador;
}

interface UpdateFuncaoData {
  funcao: FuncaoUtilizador;
}

interface UpdateActivoData {
  activo: boolean;
}

export const utilizadorService = {
  async list() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        funcao: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async getById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        funcao: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new Error("NOT_FOUND");
    return user;
  },

  async create(data: CreateUserData) {
    if (!data.name) throw new Error("NAME_REQUIRED");
    if (!data.email) throw new Error("EMAIL_REQUIRED");
    if (!data.password) throw new Error("PASSWORD_REQUIRED");
    if (!data.funcao) throw new Error("FUNCAO_REQUIRED");

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) throw new Error("EMAIL_ALREADY_EXISTS");

    // Create user using Better Auth internal API
    // This will hash the password and send verification email
    const user = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name,
      },
    });

    if (!user || !user.user) {
      throw new Error("USER_CREATION_FAILED");
    }

    // Update the user's role and active status
    return prisma.user.update({
      where: { id: user.user.id },
      data: {
        funcao: data.funcao,
        activo: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        funcao: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async updateFuncao(id: string, data: UpdateFuncaoData, currentUserId: string) {
    await this.getById(id);

    // Cannot change own role
    if (id === currentUserId) {
      throw new Error("CANNOT_CHANGE_OWN_FUNCAO");
    }

    // Check if there will be at least one ADMINISTRADOR left
    if (data.funcao !== "ADMINISTRADOR") {
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { funcao: true },
      });
      
      if (targetUser?.funcao === "ADMINISTRADOR") {
        const adminCount = await prisma.user.count({
          where: {
            funcao: "ADMINISTRADOR",
            id: { not: id }, // Exclude the user we're updating
          },
        });
        
        if (adminCount === 0) {
          throw new Error("MUST_HAVE_ADMIN");
        }
      }
    }

    return prisma.user.update({
      where: { id },
      data: { funcao: data.funcao },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        funcao: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async updateActivo(id: string, data: UpdateActivoData, currentUserId: string) {
    await this.getById(id);

    // Cannot deactivate own account
    if (id === currentUserId) {
      throw new Error("CANNOT_CHANGE_OWN_ACTIVO");
    }

    return prisma.user.update({
      where: { id },
      data: { activo: data.activo },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        funcao: true,
        activo: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async delete(id: string, currentUserId: string) {
    await this.getById(id);

    // Cannot delete own account
    if (id === currentUserId) {
      throw new Error("CANNOT_DELETE_SELF");
    }

    // Check if deleting last ADMINISTRADOR
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { funcao: true },
    });

    if (targetUser?.funcao === "ADMINISTRADOR") {
      const adminCount = await prisma.user.count({
        where: {
          funcao: "ADMINISTRADOR",
          id: { not: id },
        },
      });

      if (adminCount === 0) {
        throw new Error("MUST_HAVE_ADMIN");
      }
    }

    return prisma.user.delete({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  },
};