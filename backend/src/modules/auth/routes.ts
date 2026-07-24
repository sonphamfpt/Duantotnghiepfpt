import { Router } from 'express';
import { authController } from './controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authGuard } from '../../middlewares/authGuard';
import { registerSchema, loginSchema, forgotPasswordOtpSchema, resetPasswordSchema } from './dto';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validateRequest(registerSchema),
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  validateRequest(loginSchema),
  authController.login
);

// GET /api/auth/me
router.get(
  '/me',
  authGuard,
  authController.me
);

// POST /api/auth/send-otp
router.post('/send-otp', authController.sendOtp);

// POST /api/auth/verify-otp
router.post('/verify-otp', authController.verifyOtp);

// POST /api/auth/forgot-password/send-otp
router.post(
  '/forgot-password/send-otp',
  validateRequest(forgotPasswordOtpSchema),
  authController.sendForgotPasswordOtp
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

export default router;
