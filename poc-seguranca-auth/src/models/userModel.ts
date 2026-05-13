import { PrismaClient } from '@prisma/client';

// ==========================================
// Model — camada de acesso ao banco de dados
// Toda query ao Prisma fica aqui, centralizada
// ==========================================

const db = new PrismaClient();

export const UserModel = {
  findByUsername: (username: string) =>
    db.user.findUnique({ where: { username } }),

  findById: (id: number) =>
    db.user.findUnique({ where: { id } }),

  findByRecoveryToken: (hashToken: string) =>
    db.user.findFirst({ where: { recoveryToken: hashToken } }),

  create: (data: { username: string; passwordHash: string; twoFactorSecret: string }) =>
    db.user.create({ data }),

  updateRecoveryToken: (id: number, recoveryToken: string, recoveryTokenExpires: Date) =>
    db.user.update({
      where: { id },
      data: { recoveryToken, recoveryTokenExpires }
    }),

  updatePassword: (id: number, passwordHash: string) =>
    db.user.update({
      where: { id },
      data: { passwordHash, recoveryToken: null, recoveryTokenExpires: null }
    }),
};
