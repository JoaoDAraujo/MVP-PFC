import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { RecoveryController } from '../controllers/recoveryController';
import { authLimiter } from '../middlewares/security';

const router = Router();

router.post('/signup',                     AuthController.signup);
router.post('/login',        authLimiter,  AuthController.login);
router.post('/verify-token', authLimiter,  AuthController.verifyToken);
router.post('/logout',                     AuthController.logout);

router.post('/send-mfa-email', authLimiter, AuthController.sendMfaEmail);

router.post('/auth/google',  authLimiter,  AuthController.googleAuth);

router.post('/recover/start',  authLimiter, RecoveryController.start);
router.post('/recover/verify', authLimiter, RecoveryController.verify);
router.post('/recover/reset',  authLimiter, RecoveryController.reset);

export default router;