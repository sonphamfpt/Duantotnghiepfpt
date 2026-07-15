import { Request, Response, NextFunction } from 'express';
import { authService } from './service';
import { prisma } from '../../config/prisma';
import { serializeBigInt } from '../../utils/serialize';
import { AppError } from '../../middlewares/errorHandler';
import { normalizeOtpPhone, otpHelper } from './otp';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

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
      // Nếu request gửi kèm thông tin lịch hẹn, kiểm tra xung đột
      const { dentistId, startTime, serviceId } = req.body;
      if (phone && startTime) {
        const patient = await prisma.patient.findUnique({ where: { phone: phone.trim() } });
        if (patient) {
          const reqStart = new Date(startTime);
          if (!isNaN(reqStart.getTime())) {
            // Thử xác định thời lượng dịch vụ nếu có serviceId (nếu numeric)
            let durationMinutes = 30; // default nếu chưa xác định được dịch vụ
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
              throw new AppError(409, 'Số điện thoại này đã có lịch hẹn trùng thời gian với bác sĩ khác. Vui lòng kiểm tra lại.', 'PHONE_CONFLICT');
            }
          }
        }
      }

      await otpHelper.generateOtp(phone);
      return res.status(200).json({
        message: 'Gửi mã OTP thành công!',
        data: { phone },
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
      const { phone, code } = req.body;
      if (!phone || !code) {
        throw new AppError(400, 'Số điện thoại và mã OTP là bắt buộc', 'VALIDATION_ERROR');
      }
      const normalizedPhone = normalizeOtpPhone(phone);
      const isValid = await otpHelper.verifyOtp(normalizedPhone, code);
      if (!isValid) {
        throw new AppError(400, 'Mã OTP không chính xác hoặc đã hết hạn', 'INVALID_OTP');
      }

      // Ký một token xác thực OTP tạm thời có hạn dùng 5 phút
      const otpToken = jwt.sign(
        { phone: normalizedPhone, verified: true },
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
}

export const authController = new AuthController();
