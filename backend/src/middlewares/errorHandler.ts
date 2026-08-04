import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode?: string;

  constructor(statusCode: number, message: string, errorCode?: string) {
    let finalMessage = message;
    let finalCode = errorCode;

    // Tự động nhận diện nếu người dùng truyền (statusCode, 'CODE_NAME', 'Thông báo tiếng Việt')
    if (errorCode && !message.includes(' ') && errorCode.includes(' ')) {
      finalMessage = errorCode;
      finalCode = message;
    }

    super(finalMessage);
    this.statusCode = statusCode;
    this.errorCode = finalCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 1. Chỉ log lỗi hệ thống nghiêm trọng (500+) ra console
  //    Bỏ qua các lỗi nghiệp vụ thông thường: 401, 403, 404, 422, 429
  const isAppError = err instanceof AppError;
  const shouldLog = !isAppError || err.statusCode >= 500;
  if (shouldLog) {
    console.error('💥 [SERVER ERROR]:', err);
  }

  // 2. Lỗi do Validate input Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu đầu vào không hợp lệ',
        details: err.format(),
      },
    });
  }

  // 3. Lỗi do Nghiệp vụ định nghĩa trước (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.errorCode || 'BUSINESS_ERROR',
        message: err.message,
      },
    });
  }

  // 4. Lỗi từ CSDL Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Trùng khóa chính/độc nhất
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT_ERROR',
          message: 'Dữ liệu đã tồn tại trong hệ thống',
        },
      });
    }
    // Sai khóa ngoại
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: {
          code: 'FOREIGN_KEY_VIOLATION',
          message: 'Liên kết dữ liệu không hợp lệ',
        },
      });
    }
  }

  // Lỗi vi phạm ràng buộc Exclude của Postgres (Trùng lịch hẹn)
  if (err.message && (err.message.includes('23P01') || err.message.toLowerCase().includes('exclude'))) {
    return res.status(409).json({
      error: {
        code: 'APPOINTMENT_OVERLAP',
        message: 'Lịch đặt bị trùng với lịch khám hiện tại của bác sĩ hoặc phòng khám này.',
      },
    });
  }

  // 5. Lỗi mặc định (Internal Server Error)
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.',
    },
  });
};
