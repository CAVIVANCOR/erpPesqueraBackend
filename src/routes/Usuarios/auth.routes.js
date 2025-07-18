import { Router } from 'express';
import * as authController from '../../controllers/Usuarios/auth.controller.js';

const router = Router();

// Endpoint de login
router.post('/login', authController.login);
// Endpoint de registro (opcional, solo para admins o pruebas)
router.post('/register', authController.register);
// Endpoint de refresh token
router.post('/refresh', authController.refreshToken);
// Endpoint de logout seguro
router.post('/logout', authController.logout);

export default router;
