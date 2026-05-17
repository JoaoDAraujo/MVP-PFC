import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';

declare module 'express-session' {
  interface SessionData {
    userId?:                string;   
    pending2faUserId?:      string; 
    mfaEmailCodeHash?:      string; 
    mfaEmailExpires?:       number; 
    pendingRecoveryUserId?: string; 
    recoveryVerified?:      boolean;
  }
}

export function applySecurityMiddlewares(app: express.Application) {
  app.use(helmet({
    contentSecurityPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
  }));

  app.use(cors());
  app.use(express.json());

  app.use(express.static(path.join(__dirname, '../../public')));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'chave-super-secreta-poc-123',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure:   true,
      httpOnly: true,
      maxAge:   15 * 60 * 1000
    }
  }));
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas. Tente novamente mais tarde.' }
});