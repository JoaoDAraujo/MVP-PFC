import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { isAuthenticated } from '../middlewares/auth';

const router = Router();

router.get('/dashboard', isAuthenticated, AuthController.dashboard);

export default router;