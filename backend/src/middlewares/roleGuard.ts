import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

/**
 * Middleware kiểm tra quyền truy cập theo vai trò (role-based access control).
 * Phải sử dụng sau authGuard để đảm bảo req.user đã được điền.
 *
 * Ví dụ: router.get('/dashboard', authGuard, requireRole('manager'), handler)
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Vui lòng đăng nhập để truy cập.', 'UNAUTHORIZED'));
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return next(
        new AppError(
          403,
          `Bạn không có quyền thực hiện hành động này. Yêu cầu quyền: [${allowedRoles.join(', ')}].`,
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
};
