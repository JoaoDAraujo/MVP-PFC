import { Request, Response, NextFunction } from 'express';

// ==========================================
// Middleware de Autenticação
// Verifica se há sessão válida antes de liberar rotas protegidas
// ==========================================

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Acesso negado.' });
  }
  next();
}
