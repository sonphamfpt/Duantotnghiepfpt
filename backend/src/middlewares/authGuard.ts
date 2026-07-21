import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { prisma } from '../config/prisma';

export interface UserPayload {
  userId: string; // Lưu dạng chuỗi vì BigInt của DB
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authGuard = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Vui lòng cung cấp token xác thực hợp lệ.', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = decoded;

    // Real-time Check: Kiểm tra trạng thái & phân quyền trực tiếp trong CSDL
    if (decoded.userId) {
      const dbUser = await prisma.user.findUnique({
        where: { userId: BigInt(decoded.userId) },
        include: { role: true, staffPermission: true }
      });
      if (dbUser && dbUser.status === 'Inactive') {
        return next(new AppError(401, 'Tài khoản của bạn đã bị ngưng hoạt động bởi Quản trị viên.', 'USER_INACTIVE'));
      }

      if (dbUser && dbUser.role.code !== 'patient') {
        const perm = dbUser.staffPermission;
        if (dbUser.role.code === 'receptionist' && perm && !perm.admission) {
          return next(new AppError(403, 'Tài khoản Lễ tân chưa được cấp quyền Đón tiếp.', 'PERMISSION_DENIED'));
        }
        if (dbUser.role.code === 'dentist' && perm && !perm.clinical) {
          return next(new AppError(403, 'Tài khoản Bác sĩ chưa được cấp quyền Khám lâm sàng.', 'PERMISSION_DENIED'));
        }
        if (dbUser.role.code === 'cashier' && perm && !perm.checkout) {
          return next(new AppError(403, 'Tài khoản Thu ngân chưa được cấp quyền Tính tiền.', 'PERMISSION_DENIED'));
        }
        if (dbUser.role.code === 'manager' && perm && !perm.settings) {
          return next(new AppError(403, 'Tài khoản Quản lý chưa được cấp quyền Cấu hình hệ thống.', 'PERMISSION_DENIED'));
        }
      }
    }

    return next();
  } catch (error) {
    if (error instanceof AppError) return next(error);
    return next(new AppError(401, 'Token đã hết hạn hoặc không hợp lệ.', 'UNAUTHORIZED'));
  }
};
