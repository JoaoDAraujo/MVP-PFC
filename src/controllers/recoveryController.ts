import { Request, Response } from 'express';
import argon2 from 'argon2';
import crypto from 'crypto';
import { UserModel } from '../models/userModel';
import { sendRecoveryCodeEmail } from '../utils/mailer';

function generateOtpCode(): string {
  const num = crypto.randomBytes(4).readUInt32BE(0) % 1_000_000;
  return num.toString().padStart(6, '0');
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const RecoveryController = {

  async start(req: Request, res: Response) {
    const { username } = req.body;

    if (!username?.trim()) {
      return res.status(400).json({ error: 'Informe o nome de usuário.' });
    }

    try {
      const user = await UserModel.findByUsername(username.trim());

      if (!user || !user.email) {
        await new Promise(r => setTimeout(r, 400));
        return res.status(200).json({ message: 'Se o usuário existir, um código será enviado para o e-mail cadastrado.' });
      }

      const code    = generateOtpCode();
      const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

      await UserModel.updateRecoveryToken(user.id, hashCode(code), expires);

      req.session.pendingRecoveryUserId = user.id;
      req.session.recoveryVerified      = false;

      void sendRecoveryCodeEmail(user.email, user.username, code).catch(err =>
        console.error('[mailer] Falha ao enviar e-mail de recuperação:', err)
      );

      console.log(`[audit] Código de recuperação gerado para: ${user.username}`);
      return res.status(200).json({ message: 'Código enviado para o e-mail cadastrado.' });
    } catch (err) {
      console.error('[recover/start]', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  },

  async verify(req: Request, res: Response) {
    const { token } = req.body;
    const userId = req.session.pendingRecoveryUserId;

    if (!userId) {
      return res.status(401).json({ error: 'Sessão de recuperação expirada. Comece novamente.' });
    }
    if (!token?.trim()) {
      return res.status(400).json({ error: 'Código obrigatório.' });
    }

    try {
      const user = await UserModel.findById(userId);

      if (
        !user?.recoveryToken ||
        !user.recoveryTokenExpires ||
        (user.recoveryTokenExpires.toDate?.() ?? user.recoveryTokenExpires) < new Date()
      ) {
        console.log(`[audit] Código de recovery expirado — userId: ${userId}`);
        return res.status(401).json({ error: 'Código expirado. Solicite um novo.' });
      }

      if (hashCode(token.trim()) !== user.recoveryToken) {
        console.log(`[audit] Código de recovery inválido — userId: ${userId}`);
        return res.status(401).json({ error: 'Código inválido.' });
      }

      await UserModel.updateRecoveryToken(user.id, '', new Date(0));
      req.session.recoveryVerified = true;

      console.log(`[audit] Identidade confirmada via e-mail na recuperação — userId: ${userId}`);
      return res.status(200).json({ message: 'Identidade confirmada.' });
    } catch (err) {
      console.error('[recover/verify]', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  },

  async reset(req: Request, res: Response) {
    const { password } = req.body;
    const userId   = req.session.pendingRecoveryUserId;
    const verified = req.session.recoveryVerified;

    if (!userId || !verified) {
      return res.status(401).json({ error: 'Sessão inválida. Reinicie o processo de recuperação.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres.' });
    }

    try {
      const newPasswordHash = await argon2.hash(password, { type: argon2.argon2id });
      await UserModel.updatePassword(userId, newPasswordHash);

      req.session.pendingRecoveryUserId = undefined;
      req.session.recoveryVerified      = undefined;

      console.log(`[audit-sucesso] Senha redefinida com sucesso — userId: ${userId}`);
      return res.status(200).json({ message: 'Senha atualizada com sucesso!' });
    } catch (err) {
      console.error('[recover/reset]', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  },
};