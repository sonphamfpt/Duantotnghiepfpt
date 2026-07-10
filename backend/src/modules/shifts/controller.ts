import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { CreateShiftSchema, SwapShiftsSchema, TransferShiftSchema, ResolveConflictSchema } from './dto';
import { serializeBigInt } from '../../utils/serialize';

const parseId = (id: any): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

/**
 * Lấy danh sách ca trực bác sĩ
 */
export async function getShiftsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dentistIdStr = req.query.dentistId as string;
    const dentistId = dentistIdStr ? parseId(dentistIdStr) : undefined;
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    const startDate = startDateStr ? new Date(`${startDateStr}T00:00:00.000Z`) : undefined;
    const endDate = endDateStr ? new Date(`${endDateStr}T23:59:59.000Z`) : undefined;

    const data = await service.getShifts({ dentistId, startDate, endDate });

    // Ánh xạ sang DoctorShift (định dạng khớp với Frontend)
    const formatted = data.map(s => {
      const dateObj = new Date(s.workDate);
      const y = dateObj.getFullYear();
      const m = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const d = dateObj.getDate().toString().padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      return {
        id: `SH-${s.shiftId.toString().padStart(2, '0')}`,
        dentistId: `D-${s.dentistId.toString().padStart(2, '0')}`,
        dentistName: s.dentist?.user?.fullName || 'Bác sĩ',
        date: dateStr,
        shiftType: s.shiftType,
        room: s.room?.name || 'Phòng khám'
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Tạo mới hoặc cập nhật ca trực bác sĩ
 */
export async function createShiftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = CreateShiftSchema.parse(req.body);
    const dentistId = parseId(body.dentistId);
    const workDate = new Date(`${body.workDate}T00:00:00.000Z`);

    const data = await service.createShift({
      dentistId,
      workDate,
      shiftType: body.shiftType,
      roomId: body.roomId,
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo ca trực thành công',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Hoán đổi ca trực giữa hai bác sĩ
 */
export async function swapShiftsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { shiftId1, shiftId2 } = SwapShiftsSchema.parse(req.body);
    const data = await service.swapShifts(parseId(shiftId1), parseId(shiftId2));
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Chuyển giao ca trực cho bác sĩ khác
 */
export async function transferShiftHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { shiftId, targetDentistId } = TransferShiftSchema.parse(req.body);
    const data = await service.transferShift(parseId(shiftId), parseId(targetDentistId));
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy danh sách các thông báo đổi ca trực cho lễ tân (định dạng khớp frontend)
 */
export async function getShiftNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const notifications = await service.getShiftNotifications();
    
    const formatted = notifications.map((notif: any) => {
      const affected = notif.affectedItems.map((item: any) => ({
        appointmentId: item.appointmentId.toString(),
        patientName: item.appointment.patient.user.fullName,
        patientPhone: item.appointment.patient.phone,
        time: item.appointment.startTime.toISOString(),
        serviceName: item.appointment.service.name,
        resolved: item.resolved,
        resolvedAction: item.resolvedAction || undefined,
      }));

      return {
        id: `SCN-${notif.notifId}`,
        createdAt: notif.createdAt.toISOString(),
        shiftDate: notif.shiftDate.toISOString().split('T')[0],
        shiftType: notif.shiftType,
        originalDentistId: notif.originalDentistId.toString(),
        originalDentistName: notif.originalDentist.user.fullName,
        newDentistId: notif.newDentistId.toString(),
        newDentistName: notif.newDentist.user.fullName,
        affectedItems: affected,
      };
    });

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lễ tân giải quyết một lịch hẹn bị ảnh hưởng
 */
export async function resolveConflictItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const notifId = parseId(req.params.notifId);
    const appointmentId = parseId(req.params.appointmentId);
    const { action } = ResolveConflictSchema.parse(req.body);

    const data = await service.resolveConflictItem(notifId, appointmentId, action);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}
