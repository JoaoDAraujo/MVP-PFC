import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { RecoveryController } from '../controllers/recoveryController';
import { authLimiter } from '../middlewares/security';

// ==========================================
// Rotas de Autenticação e Recuperação
// Apenas mapeia URL → middleware → controller. Sem lógica aqui.
// ==========================================

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', authLimiter, AuthController.login);
router.post('/verify-token', authLimiter, AuthController.verifyToken);
router.post('/forgot-password', authLimiter, RecoveryController.forgotPassword);
router.post('/reset-password', authLimiter, RecoveryController.resetPassword);
router.post('/logout', AuthController.logout);

export default router;
