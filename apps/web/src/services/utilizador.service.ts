import prisma from "@festas/db";
import { auth } from "@festas/auth";
import type { FuncaoUtilizador } from "@saas/shared-types";
import { hashPassword } from "better-auth/crypto";

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

interface UpdatePasswordData {
  password: string;
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

  async updatePassword(id: string, data: UpdatePasswordData, currentUserId: string) {
    await this.getById(id);

    // Cannot change own password here (use the password recovery flow instead)
    if (id === currentUserId) {
      throw new Error("CANNOT_CHANGE_OWN_PASSWORD");
    }

    if (!data.password || data.password.length < 8) {
      throw new Error("PASSWORD_TOO_SHORT");
    }

    // Hash and store the new password on the credential account
    const hashedPassword = await hashPassword(data.password);

    await prisma.account.updateMany({
      where: {
        userId: id,
        providerId: "credential",
      },
      data: {
        password: hashedPassword,
      },
    });

    return { message: "Password atualizada com sucesso" };
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