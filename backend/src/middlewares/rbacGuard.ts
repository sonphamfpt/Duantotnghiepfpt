import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from './errorHandler';

export const rbacGuard = (options: { 
  roles?: string[]; 
  permission?: 'admission' | 'clinical' | 'checkout' | 'settings';
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return next(new AppError(401, 'Yêu cầu xác thực tài khoản.', 'UNAUTHORIZED'));
    }

    // 1. Người quản lý (manager) luôn được phép thực hiện mọi hành động
    if (user.role === 'manager') {
      return next();
    }

    // 2. Kiểm tra xem vai trò của user có nằm trong danh sách được cho phép hay không
    if (options.roles && options.roles.includes(user.role)) {
      return next();
    }

    // 3. Kiểm tra phân quyền chi tiết trong bảng staff_permissions
    if (options.permission) {
      try {
        const permissionRecord = await prisma.staffPermission.findUnique({
          where: { userId: BigInt(user.userId) },
        });

        if (permissionRecord && permissionRecord[options.permission] === true) {
          return next();
        }
      } catch (error) {
        return next(new AppError(500, 'Lỗi kiểm tra quyền hạn hệ thống.', 'INTERNAL_ERROR'));
      }
    }

    // Không thỏa mãn bất kỳ điều kiện nào
    return next(new AppError(403, 'Bạn không có quyền truy cập chức năng này.', 'FORBIDDEN'));
  };
};
