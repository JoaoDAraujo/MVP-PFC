import { Request, Response } from 'express';
import argon2 from 'argon2';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { UserModel } from '../models/userModel';
import { encryptAES, decryptAES } from '../utils/crypto';

// ==========================================
// Controller de Autenticação
// Lógica de negócio de signup, login, 2FA, logout e dashboard
// ==========================================

export const AuthController = {

  // Cadastro: hash da senha + geração e criptografia do segredo TOTP
  async signup(req: Request, res: Response) {
    const { username, password } = req.body;
    try {
      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16, // 64MB — resistência a GPUs/ASICs
        timeCost: 3,
        parallelism: 1
      });
      const mfaSecret = speakeasy.generateSecret({ name: `PoC_Auth (${username})` });

      // Criptografa o segredo 2FA antes de salvar (dado em repouso)
      const encryptedSecret = encryptAES(mfaSecret.base32);

      await UserModel.create({ username, passwordHash, twoFactorSecret: encryptedSecret });

      const qrCodeImage = await qrcode.toDataURL(mfaSecret.otpauth_url!);
      res.status(201).json({ message: 'Conta criada. Leia o QR Code.', qrCodeUrl: qrCodeImage });
    } catch {
      res.status(400).json({ error: 'Falha ao registrar usuário.' });
    }
  },

  // Login: valida senha e inicia fluxo de 2FA
  async login(req: Request, res: Response) {
    const { username, password } = req.body;
    const user = await UserModel.findByUsername(username);

    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Estado temporário na sessão: aguardando 2FA
    req.session.pending2faUserId = user.id;
    res.json({ message: 'Senha ok. Informe o token.', require2FA: true });
  },

  // Verificação do token TOTP — segunda etapa do login
  async verifyToken(req: Request, res: Response) {
    const { token } = req.body;
    const pendingId = req.session.pending2faUserId;

    if (!pendingId) return res.status(403).json({ error: 'Sessão expirada.' });

    const user = await UserModel.findById(pendingId);
    if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'Erro de validação.' });

    // Descriptografa o segredo AES para validar o token TOTP
    const decryptedSecret = decryptAES(user.twoFactorSecret);
    if (!decryptedSecret) return res.status(500).json({ error: 'Falha de criptografia no servidor.' });

    const isTokenValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token
    });

    if (!isTokenValid) return res.status(401).json({ error: 'Token inválido.' });

    // Promove sessão: 2FA validado, acesso liberado
    req.session.userId = user.id;
    req.session.pending2faUserId = undefined;
    console.log(`[audit] login com sucesso via mfa: user ${user.username}`);
    res.json({ message: 'Acesso liberado!' });
  },

  // Rota protegida de exemplo
  dashboard(_req: Request, res: Response) {
    res.json({ message: 'Você acessou uma rota protegida.' });
  },

  // Logout: destrói sessão no servidor e remove cookie no cliente
  logout(req: Request, res: Response) {
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.json({ message: 'Você saiu do sistema.' });
    });
  },
};