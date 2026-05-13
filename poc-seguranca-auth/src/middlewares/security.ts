import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';

// ==========================================
// Middleware de Segurança
// Configurações de helmet, cors, session e rate limit centralizadas aqui
// ==========================================

// Declaração de tipos para a sessão (necessário para TypeScript)
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    pending2faUserId?: number;
  }
}

// Aplica todos os middlewares de segurança na aplicação
export function applySecurityMiddlewares(app: express.Application) {
  // Bloqueio de conexões não seguras via HSTS
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  }));

  app.use(cors());
  app.use(express.json());

  // Servir arquivos estáticos (View — pasta public/)
  app.use(express.static(path.join(__dirname, '../../public')));

  // Gerenciamento de sessão segura
  app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-super-secreta-poc-123',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,    // Restringe cookie a conexões HTTPS
      httpOnly: true,
      maxAge: 15 * 60 * 1000
    }
  }));
}

// Rate limiter para rotas de autenticação (proteção contra força bruta)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Janela de 15 minutos
  max: 5,                      // Máximo de 5 tentativas por IP
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});
