import { Request, Response } from 'express';
import argon2 from 'argon2';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UserModel } from '../models/userModel';
import { encryptAES, decryptAES } from '../utils/crypto';
import { sendWelcomeEmail, sendMfaCodeEmail } from '../utils/mailer';

// ==========================================
// Controller de Autenticação
// ==========================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export const AuthController = {

  async signup(req: Request, res: Response) {
    const { username, email, password, lgpdAccepted } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Usuário, e-mail e senha são obrigatórios.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 8 caracteres.' });
    }
    if (!lgpdAccepted) {
      return res.status(400).json({ error: 'É necessário concordar com os Termos de Uso para criar uma conta.' });
    }

    const emailNormalized = email.trim().toLowerCase();

    try {
      // Bloqueia username OU e-mail duplicado
      const [existingByUsername, existingByEmail] = await Promise.all([
        UserModel.findByUsername(username),
        UserModel.findByEmail(emailNormalized),
      ]);
      if (existingByUsername) {
        return res.status(400).json({ error: 'Nome de usuário já cadastrado.' });
      }
      if (existingByEmail) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1,
      });

      const mfaSecret       = speakeasy.generateSecret({ name: `PoC_Auth (${username})` });
      const encryptedSecret = encryptAES(mfaSecret.base32);

      await UserModel.create({
        username,
        email:           emailNormalized,
        passwordHash,
        twoFactorSecret: encryptedSecret,
        lgpdAcceptedAt:  new Date(),
      });

      const qrCodeImage = await qrcode.toDataURL(mfaSecret.otpauth_url!);

      void sendWelcomeEmail(emailNormalized, username, qrCodeImage).catch(err =>
        console.error('[mailer] Falha ao enviar e-mail de boas-vindas:', err)
      );

      return res.status(201).json({ message: 'Conta criada. Leia o QR Code.', qrCodeUrl: qrCodeImage });
    } catch (err) {
      console.error('[signup]', err);
      return res.status(400).json({ error: 'Falha ao registrar usuário.' });
    }
  },

  async login(req: Request, res: Response) {
    const { email, username, password } = req.body;

    if ((!email && !username) || !password) {
      return res.status(400).json({ error: 'Informe usuário ou e-mail e a senha.' });
    }

    try {
      const user = email
        ? await UserModel.findByEmail(email.trim().toLowerCase())
        : await UserModel.findByUsername(username.trim());

      if (!user || !user.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      req.session.pending2faUserId = user.id;
      return res.json({ message: 'Senha ok. Informe o token.', require2FA: true });
    } catch (err) {
      console.error('[login]', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  },

  // gera OTP de 6 dígitos e envia para o e-mail do usuario
  async sendMfaEmail(req: Request, res: Response) {
    const userId = req.session.pending2faUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    try {
      const user = await UserModel.findById(userId);
      if (!user?.email) {
        return res.status(400).json({ error: 'E-mail não encontrado para este usuário.' });
      }

      const code    = (crypto.randomBytes(4).readUInt32BE(0) % 1_000_000).toString().padStart(6, '0');
      const expires = Date.now() + 15 * 60 * 1000; // 15 minutos

      // guarda hash do OTP na sessao (não no banco — é temporário por login)
      req.session.mfaEmailCodeHash    = hashCode(code);
      req.session.mfaEmailExpires     = expires;

      void sendMfaCodeEmail(user.email, user.username, code).catch(err =>
        console.error('[mailer] Falha ao enviar código MFA por e-mail:', err)
      );

      return res.status(200).json({ message: 'Código enviado para o e-mail cadastrado.' });
    } catch (err) {
      console.error('[send-mfa-email]', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  },

  async verifyToken(req: Request, res: Response) {
    const { token, method } = req.body;
    const pendingId = req.session.pending2faUserId;

    if (!pendingId) return res.status(403).json({ error: 'Sessão expirada.' });
    if (!token)     return res.status(400).json({ error: 'Código obrigatório.' });

    try {
      if (method === 'email') {
        const codeHash = req.session.mfaEmailCodeHash;
        const expires  = req.session.mfaEmailExpires;

        if (!codeHash || !expires || Date.now() > expires) {
          return res.status(401).json({ error: 'Código expirado. Solicite um novo.' });
        }
        if (hashCode(token) !== codeHash) {
          return res.status(401).json({ error: 'Código inválido.' });
        }
        req.session.mfaEmailCodeHash = undefined;
        req.session.mfaEmailExpires  = undefined;

      } else {
        const user = await UserModel.findById(pendingId);
        if (!user?.twoFactorSecret) {
          return res.status(400).json({ error: 'Erro de validação.' });
        }

        const decryptedSecret = decryptAES(user.twoFactorSecret);
        if (!decryptedSecret) {
          return res.status(500).json({ error: 'Falha de criptografia no servidor.' });
        }

        const isValid = speakeasy.totp.verify({
          secret: decryptedSecret, encoding: 'base32', token,
        });
        if (!isValid) return res.status(401).json({ error: 'Token inválido.' });
      }
      req.session.userId           = pendingId;
      req.session.pending2faUserId = undefined;
      console.log(`[audit] login com sucesso via 2FA (${method ?? 'app'}): userId ${pendingId}`);
      return res.json({ message: 'Acesso liberado!' });

    } catch (err) {
      console.error('[verify-token]', err);
      return res.status(500).json({ error: 'Erro interno.' });
    }
  },
  async googleAuth(req: Request, res: Response) {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Token do Google ausente.' });

    try {
      const ticket  = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email) return res.status(401).json({ error: 'Token inválido.' });

      const emailNormalized = payload.email.toLowerCase();
      const googleId        = payload.sub;
      const googleName      = payload.name ?? emailNormalized.split('@')[0];

      let user = await UserModel.findByGoogleId(googleId)
              ?? await UserModel.findByEmail(emailNormalized);

      if (!user) {
        const mfaSecret   = speakeasy.generateSecret({ name: `PoC_Auth (${googleName})` });
        const qrCodeImage = await qrcode.toDataURL(mfaSecret.otpauth_url!);
        user = await UserModel.create({
          username: googleName, email: emailNormalized, passwordHash: '',
          twoFactorSecret: encryptAES(mfaSecret.base32),
          lgpdAcceptedAt: new Date(), googleId,
        });
        void sendWelcomeEmail(emailNormalized, googleName, qrCodeImage).catch(err =>
          console.error('[mailer] Falha e-mail boas-vindas Google:', err)
        );
      } else if (!user.googleId) {
        await UserModel.linkGoogleId(user.id, googleId);
      }

      req.session.pending2faUserId = user.id;
      return res.json({ require2FA: true });
    } catch (err) {
      console.error('[google-auth]', err);
      return res.status(401).json({ error: 'Falha ao verificar token do Google.' });
    }
  },

  dashboard(_req: Request, res: Response) {
    res.json({ message: 'Você acessou uma rota protegida.' });
  },

  logout(req: Request, res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Você saiu do sistema.' });
    });
  },
};