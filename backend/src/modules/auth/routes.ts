import { Router } from 'express';
import { authController } from './controller';
import { validateRequest } from '../../middlewares/validateRequest';
import { authGuard } from '../../middlewares/authGuard';
import { registerSchema, loginSchema, forgotPasswordOtpSchema, resetPasswordSchema } from './dto';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

// Thư mục lưu trữ avatar
const AVATAR_DIR = path.join(__dirname, '../../public/avatars');
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});
const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc GIF.'));
  },
});

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

// POST /api/auth/avatar — Upload ảnh đại diện
router.post(
  '/avatar',
  authGuard,
  avatarUpload.single('avatar'),
  authController.uploadAvatar
);

// PUT /api/auth/change-password — Đổi mật khẩu
router.put(
  '/change-password',
  authGuard,
  authController.changePassword
);

// PUT /api/auth/profile — Cập nhật thông tin cá nhân theo Role
router.put(
  '/profile',
  authGuard,
  authController.updateProfile
);

export default router;
