import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import argon2 from 'argon2';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import fs from 'fs';
import selfsigned from 'selfsigned';

const app = express();
const db = new PrismaClient();

// ==========================================
// Configurações de Criptografia (AES-256-GCM)
// ==========================================
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
const AES_ALGORITHM = 'aes-256-gcm';

// Criptografa dados sensíveis antes da persistência
function encryptAES(text: string): string {
    const iv = crypto.randomBytes(12); // IV de 12 bytes padrão para GCM
    const cipher = crypto.createCipheriv(AES_ALGORITHM, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`; // Formato: IV:AuthTag:EncryptedText
}

// Descriptografa dados provenientes do banco
function decryptAES(encryptedData: string): string | null {
    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 3) return null;
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encryptedText = parts[2];
        
        const decipher = crypto.createDecipheriv(AES_ALGORITHM, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        return null;
    }
}

// ==========================================
// Segurança e Middlewares
// ==========================================
// Bloqueio de conexões não seguras via HSTS
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true } 
}));
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use(session({
  secret: 'chave-super-secreta-poc-123',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Restringe cookie a conexões HTTPS
    httpOnly: true, 
    maxAge: 15 * 60 * 1000 
  }
}));

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    pending2faUserId?: number;
  }
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});

// ==========================================
// Rotas de Autenticação
// ==========================================
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 2 ** 16, timeCost: 3, parallelism: 1 });
    const mfaSecret = speakeasy.generateSecret({ name: `PoC_Auth (${username})` });

    // Criptografa o segredo 2FA (dado em repouso)
    const encryptedSecret = encryptAES(mfaSecret.base32);

    await db.user.create({
      data: { username, passwordHash, twoFactorSecret: encryptedSecret }
    });

    const qrCodeImage = await qrcode.toDataURL(mfaSecret.otpauth_url!);
    res.status(201).json({ message: 'Conta criada. Leia o QR Code.', qrCodeUrl: qrCodeImage });
  } catch (err) {
    res.status(400).json({ error: 'Falha ao registrar usuário.' });
  }
});

app.post('/api/login', authLimiter, async (req, res) => {
  const { username, password } = req.body;
  const user = await db.user.findUnique({ where: { username } });
  
  if (!user || !(await argon2.verify(user.passwordHash, password))) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
  
  req.session.pending2faUserId = user.id;
  res.json({ message: 'Senha ok. Informe o token.', require2FA: true });
});

app.post('/api/verify-token', authLimiter, async (req, res) => {
  const { token } = req.body;
  const pendingId = req.session.pending2faUserId;
  
  if (!pendingId) return res.status(403).json({ error: 'Sessão expirada.' });

  const user = await db.user.findUnique({ where: { id: pendingId } });
  if (!user || !user.twoFactorSecret) return res.status(400).json({ error: 'Erro de validação.' });

  // Descriptografa o segredo salvo com AES
  const decryptedSecret = decryptAES(user.twoFactorSecret);
  if (!decryptedSecret) return res.status(500).json({ error: 'Falha de criptografia no servidor.' });

  const isTokenValid = speakeasy.totp.verify({ secret: decryptedSecret, encoding: 'base32', token });
  if (!isTokenValid) return res.status(401).json({ error: 'Token inválido.' });

  req.session.userId = user.id;
  req.session.pending2faUserId = undefined;
  
  console.log(`[audit] login com sucesso via mfa: user ${user.username}`);
  res.json({ message: 'Acesso liberado!' });
});

// ==========================================
// Rotas de Recuperação de Senha
// ==========================================
app.post('/api/forgot-password', authLimiter, async (req, res) => {
    const { username } = req.body;
    const user = await db.user.findUnique({ where: { username } });
    
    if (user) {
        // Geração de token criptograficamente seguro
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hash SHA256 do token para evitar exposição no banco de dados
        const hashToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Configuração de expiração (15 minutos)
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        await db.user.update({
            where: { id: user.id },
            data: { recoveryToken: hashToken, recoveryTokenExpires: expires }
        });

        console.log(`[audit] Solicitação de recuperação de senha gerada para: ${username}`);
        
        // Obs: Em ambiente produtivo, o token deve ser enviado via provedor de e-mail.
        res.json({ message: 'Link de recuperação gerado.', token: resetToken });
    } else {
        res.status(400).json({ error: 'Usuário não encontrado.' });
    }
});

app.post('/api/reset-password', authLimiter, async (req, res) => {
    const { token, newPassword } = req.body;
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await db.user.findFirst({
        where: { recoveryToken: hashToken }
    });

    // Validação de token expirado ou inválido
    if (!user || !user.recoveryTokenExpires || user.recoveryTokenExpires < new Date()) {
        console.log(`[audit-falha] Tentativa de reset com token inválido/expirado.`);
        return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const newPasswordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    // Invalidação do token após utilização
    await db.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash, recoveryToken: null, recoveryTokenExpires: null }
    });

    console.log(`[audit-sucesso] Senha redefinida com sucesso para o usuário: ${user.username}`);
    res.json({ message: 'Senha atualizada com sucesso!' });
});

// ==========================================
// Rotas de Dashboard / Sessão
// ==========================================
app.get('/api/dashboard', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Acesso negado.' });
  res.json({ message: 'Você acessou uma rota protegida.' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid'); 
    res.json({ message: 'Você saiu do sistema.' });
  });
});

// ==========================================
// Servidores (HTTPS e Redirecionamento HTTP)
// ==========================================
const HTTP_PORT = 3000;
const HTTPS_PORT = 3443;

// Servidor secundário para redirecionamento obrigatório (HTTP -> HTTPS)
const httpApp = express();
httpApp.use((req, res) => {
    res.redirect(`https://${req.hostname}:${HTTPS_PORT}${req.originalUrl}`);
});

// Inicialização assíncrona para geração do certificado SSL local
async function startServer() {
    let sslOptions;
    try {
        if (fs.existsSync('key.pem') && fs.existsSync('cert.pem')) {
            sslOptions = { key: fs.readFileSync('key.pem'), cert: fs.readFileSync('cert.pem') };
        } else {
            console.log("[HTTPS] Gerando certificados SSL autoassinados localmente...");
            const attrs = [{ name: 'commonName', value: 'localhost' }];
            
            // Cast para 'any' para contornar limitações de tipagem da interface SelfsignedOptions
            const pems = await selfsigned.generate(attrs, { days: 365 } as any);
            
            fs.writeFileSync('key.pem', pems.private);
            fs.writeFileSync('cert.pem', pems.cert);
            sslOptions = { key: pems.private, cert: pems.cert };
        }

        // Instancia servidor HTTPS principal
        https.createServer(sslOptions, app).listen(HTTPS_PORT, () => {
            console.log(`[HTTPS] API rodando de forma segura em: https://localhost:${HTTPS_PORT}`);
        });

        // Instancia redirecionador HTTP
        http.createServer(httpApp).listen(HTTP_PORT, () => {
            console.log(`[HTTP] Redirecionador ativo na porta ${HTTP_PORT} (Redirecionando para ${HTTPS_PORT})`);
        });

    } catch (error) {
        console.error("Erro ao iniciar HTTPS. Verifique os certificados.", error);
    }
}

startServer();