import { Request, Response, NextFunction } from 'express';
import { authService } from './service';
import { prisma } from '../../config/prisma';
import { serializeBigInt } from '../../utils/serialize';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeOtpPhone, otpHelper } from './otp';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import bcrypt from 'bcrypt';
import path from 'path';
import fs from 'fs';

export class AuthController {
  /**
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      
      return res.status(201).json({
        message: 'Đăng ký tài khoản bệnh nhân thành công!',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password } = req.body;
      const result = await authService.login(identifier, password);
      
      return res.status(200).json({
        message: 'Đăng nhập thành công!',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        throw new AppError(401, 'Yêu cầu xác thực tài khoản.', 'UNAUTHORIZED');
      }

      const userProfile = await authService.getMe(userId);
      
      return res.status(200).json({
        data: serializeBigInt(userProfile),
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/auth/send-otp
   */
  async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      if (!phone) {
        throw new AppError(400, 'Số điện thoại là bắt buộc', 'VALIDATION_ERROR');
      }

      // Xác định purpose: nếu có startTime (đặt lịch) thì 'booking', ngược lại 'register'
      const { dentistId, startTime, serviceId, purpose: reqPurpose } = req.body;
      const purpose = reqPurpose || (startTime ? 'booking' : 'register');

      if (phone && startTime) {
        const patient = await prisma.patient.findFirst({ where: { user: { phone: phone.trim() } } });
        if (patient) {
          const reqStart = new Date(startTime);
          if (!isNaN(reqStart.getTime())) {
            let durationMinutes = 30;
            if (serviceId) {
              const clean = String(serviceId).replace('S-', '').replace(/[^0-9]/g, '');
              if (/^\d+$/.test(clean)) {
                const svc = await prisma.service.findUnique({ where: { serviceId: BigInt(clean) } });
                if (svc) durationMinutes = svc.durationMinutes + svc.bufferMinutes;
              }
            }
            const reqEnd = new Date(reqStart.getTime() + durationMinutes * 60 * 1000);

            const conflict = await prisma.appointment.findFirst({
              where: {
                patientId: patient.patientId,
                status: { notIn: ['Cancelled', 'NoShow'] },
                AND: [
                  { startTime: { lt: reqEnd } },
                  { endTime: { gt: reqStart } },
                ],
              },
            });

            if (conflict) {
              throw new AppError(409, 'Số điện thoại này đã có lịch hẹn trùng thời gian. Vui lòng kiểm tra lại.', 'PHONE_CONFLICT');
            }
          }
        }
      }

      await otpHelper.generateOtp(phone, purpose as 'booking' | 'register');
      return res.status(200).json({
        message: 'Gửi mã OTP thành công!',
        data: { phone, purpose },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, purpose } = req.body;
      if (!phone || !code) {
        throw new AppError(400, 'Số điện thoại và mã OTP là bắt buộc', 'VALIDATION_ERROR');
      }

      // Mặc định 'register' nếu không truyền purpose
      const otpPurpose: 'register' | 'booking' | 'forgot' =
        purpose === 'booking' ? 'booking'
        : purpose === 'forgot' ? 'forgot'
        : 'register';

      const normalizedPhone = normalizeOtpPhone(phone);
      const isValid = await otpHelper.verifyOtp(normalizedPhone, code, otpPurpose);
      if (!isValid) {
        throw new AppError(400, 'Mã OTP không chính xác hoặc đã hết hạn', 'INVALID_OTP');
      }

      // Ký token xác thực OTP tạm thời (5 phút)
      const otpToken = jwt.sign(
        { phone: normalizedPhone, verified: true, purpose: otpPurpose },
        env.JWT_SECRET,
        { expiresIn: '5m' }
      );

      return res.status(200).json({
        message: 'Xác thực OTP thành công!',
        data: { otpToken },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password/send-otp
   */
  async sendForgotPasswordOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone } = req.body;
      const result = await authService.requestPasswordResetOtp(phone);

      return res.status(200).json({
        message: 'Mã OTP đặt lại mật khẩu đã được gửi!',
        data: result,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.resetPassword(req.body);

      return res.status(200).json({
        message: 'Đặt lại mật khẩu mới thành công! Vui lòng đăng nhập lại.',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/auth/avatar — Upload ảnh đại diện
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError(401, 'Yêu cầu xác thực.', 'UNAUTHORIZED');

      if (!req.file) throw new AppError(400, 'Không có file ảnh nào được gửi lên.', 'NO_FILE');

      // Xóa avatar cũ nếu là file local
      const existingUser = await prisma.user.findUnique({ where: { userId: BigInt(userId) } });
      if (existingUser?.avatarUrl && existingUser.avatarUrl.startsWith('/avatars/')) {
        const oldPath = path.join(__dirname, '../../public', existingUser.avatarUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const avatarUrl = `/avatars/${req.file.filename}`;
      await prisma.user.update({
        where: { userId: BigInt(userId) },
        data: { avatarUrl },
      });

      return res.status(200).json({
        message: 'Cập nhật ảnh đại diện thành công!',
        data: { avatarUrl: `http://localhost:5000${avatarUrl}` },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PUT /api/auth/change-password — Đổi mật khẩu
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError(401, 'Yêu cầu xác thực.', 'UNAUTHORIZED');

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        throw new AppError(400, 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới.', 'VALIDATION_ERROR');
      }
      if (newPassword.length < 8) {
        throw new AppError(400, 'Mật khẩu mới phải có ít nhất 8 ký tự.', 'VALIDATION_ERROR');
      }

      const user = await prisma.user.findUnique({ where: { userId: BigInt(userId) } });
      if (!user || !user.passwordHash) {
        throw new AppError(404, 'Không tìm thấy tài khoản.', 'USER_NOT_FOUND');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new AppError(400, 'Mật khẩu hiện tại không chính xác.', 'WRONG_PASSWORD');
      }

      const newHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { userId: BigInt(userId) },
        data: { passwordHash: newHash },
      });

      return res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PUT /api/auth/profile — Cập nhật thông tin cá nhân theo Role
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.userId;
      if (!userId) throw new AppError(401, 'Yêu cầu xác thực.', 'UNAUTHORIZED');

      const result = await authService.updateProfile(userId, req.body);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  }
}

export const authController = new AuthController();
