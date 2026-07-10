import { Request, Response, NextFunction } from 'express';
import { appointmentsService } from './service';
import { serializeBigInt } from '../../utils/serialize';
import { AppError } from '../../middlewares/errorHandler';
import { prisma } from '../../config/prisma';

const parseId = (id: any): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

export class AppointmentsController {
  /**
   * GET /api/dentists/:dentistId/available-slots
   */
  async getAvailableSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { dentistId } = req.params;
      const { date, serviceId } = req.query as { date: string; serviceId: string };
      
      const slots = await appointmentsService.getAvailableSlots(dentistId, date, serviceId);
      
      return res.status(200).json({
        data: slots,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/appointments
   */
  async createAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { patientId, patientPhone, bookingChannel } = req.body;
      
      // Yêu cầu xác thực OTP đối với tất cả các ca đặt lịch trực tuyến (Online)
      if (bookingChannel === 'Online') {
        const otpToken = req.headers['x-otp-token'] as string;
        if (!otpToken) {
          throw new AppError(400, 'Yêu cầu mã xác thực OTP để hoàn tất đặt lịch trực tuyến.', 'OTP_REQUIRED');
        }

        let phoneToCheck = patientPhone;
        if (patientId) {
          const patient = await prisma.patient.findUnique({
            where: { patientId: parseId(patientId) }
          });
          if (patient) {
            phoneToCheck = patient.phone;
          }
        }

        if (!phoneToCheck) {
          throw new AppError(400, 'Không tìm thấy số điện thoại hợp lệ để xác thực OTP.', 'VALIDATION_ERROR');
        }

        try {
          const jwt = require('jsonwebtoken');
          const { env } = require('../../config/env');
          const decoded = jwt.verify(otpToken, env.JWT_SECRET) as { phone: string; verified: boolean };
          
          // Kiểm tra xem số điện thoại trong token có khớp với số điện thoại đặt lịch hay không
          if (decoded.phone.trim() !== phoneToCheck.trim()) {
            throw new AppError(400, 'Số điện thoại xác thực OTP không khớp với thông tin đặt lịch.', 'INVALID_OTP_TOKEN');
          }
        } catch (err) {
          throw new AppError(400, 'Mã xác thực OTP không hợp lệ hoặc đã hết hạn. Vui lòng lấy mã mới.', 'INVALID_OTP_TOKEN');
        }
      }

      const newApp = await appointmentsService.createAppointment(req.body);
      
      // Phát sự kiện qua Socket.io để tải lại thời gian thực ở các phía
      try {
        const { socketManager } = require('../../config/socket');
        socketManager.emit('appointment:created', serializeBigInt(newApp));
      } catch (err) {
        console.error('Lỗi phát sự kiện socket khi tạo lịch hẹn:', err);
      }

      return res.status(201).json({
        success: true,
        message: 'Đặt lịch hẹn thành công!',
        data: serializeBigInt(newApp),
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PATCH /api/appointments/:id/cancel
   */
  async cancelAppointment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { cancelReason } = req.body;
      
      const cancelledApp = await appointmentsService.cancelAppointment(id, cancelReason);
      
      return res.status(200).json({
        message: 'Hủy lịch hẹn thành công!',
        data: serializeBigInt(cancelledApp),
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/appointments
   */
  async getAllAppointments(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await appointmentsService.getAllAppointments();
      return res.status(200).json({
        success: true,
        data: list,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const appointmentsController = new AppointmentsController();
