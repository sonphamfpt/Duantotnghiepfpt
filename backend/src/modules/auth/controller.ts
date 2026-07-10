import { Request, Response, NextFunction } from 'express';
import { authService } from './service';
import { serializeBigInt } from '../../utils/serialize';
import { AppError } from '../../middlewares/errorHandler';
import { otpHelper } from './otp';
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
      const isValid = await otpHelper.verifyOtp(phone, code);
      if (!isValid) {
        throw new AppError(400, 'Mã OTP không chính xác hoặc đã hết hạn', 'INVALID_OTP');
      }

      // Ký một token xác thực OTP tạm thời có hạn dùng 5 phút
      const otpToken = jwt.sign(
        { phone, verified: true },
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

