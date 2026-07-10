import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from './errorHandler';

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

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError(401, 'Vui lòng cung cấp token xác thực hợp lệ.', 'UNAUTHORIZED'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    return next(new AppError(401, 'Token đã hết hạn hoặc không hợp lệ.', 'UNAUTHORIZED'));
  }
};
