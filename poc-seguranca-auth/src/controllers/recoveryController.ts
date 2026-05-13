import { Request, Response } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import { UserModel } from '../models/userModel';

// ==========================================
// Controller de Recuperação de Senha
// Lógica de geração de token e redefinição de senha
// ==========================================

export const RecoveryController = {

  // Gera token seguro de recuperação e o persiste hasheado no banco
  async forgotPassword(req: Request, res: Response) {
    const { username } = req.body;
    const user = await UserModel.findByUsername(username);

    if (user) {
      // Token criptograficamente seguro de 32 bytes
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Apenas o hash SHA-256 é salvo — o token bruto nunca toca o banco
      const hashToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      await UserModel.updateRecoveryToken(user.id, hashToken, expires);
      console.log(`[audit] Solicitação de recuperação de senha gerada para: ${username}`);

      // Em produção: enviar resetToken via e-mail, nunca expor aqui
      res.json({ message: 'Link de recuperação gerado.', token: resetToken });
    } else {
      res.status(400).json({ error: 'Usuário não encontrado.' });
    }
  },

  // Valida token e redefine a senha
  async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await UserModel.findByRecoveryToken(hashToken);

    // Rejeita token inválido ou expirado
    if (!user || !user.recoveryTokenExpires || user.recoveryTokenExpires < new Date()) {
      console.log(`[audit-falha] Tentativa de reset com token inválido/expirado.`);
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const newPasswordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    // Invalida o token após uso (uso único)
    await UserModel.updatePassword(user.id, newPasswordHash);
    console.log(`[audit-sucesso] Senha redefinida com sucesso para o usuário: ${user.username}`);
    res.json({ message: 'Senha atualizada com sucesso!' });
  },
};