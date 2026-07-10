import { Request, Response, NextFunction } from 'express';
import * as queuesService from './service';
import { CheckInSchema, UpdateStatusSchema } from './dto';
import { prisma } from '../../config/prisma';
import { socketManager } from '../../config/socket';

const parseId = (id: any): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

export async function getActiveTicketsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await queuesService.getActiveTickets();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}

export async function checkInPatientHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Validate payload structure
    const body = CheckInSchema.parse(req.body);

    const patientDbId = parseId(body.patientId);
    const dentistDbId = parseId(body.dentistId);
    let serviceDbId: bigint | undefined = undefined;

    if (body.serviceId) {
      serviceDbId = parseId(body.serviceId);
    } else if (req.body.serviceName) {
      // Tìm dịch vụ theo tên nếu truyền serviceName
      const service = await prisma.service.findFirst({
        where: { name: req.body.serviceName },
      });
      if (service) {
        serviceDbId = service.serviceId;
      }
    }

    const appointmentDbId = body.appointmentId ? parseId(body.appointmentId) : undefined;

    // 2. Call service
    const data = await queuesService.checkInPatient({
      patientId: patientDbId,
      dentistId: dentistDbId,
      serviceId: serviceDbId,
      appointmentId: appointmentDbId,
      customRoom: body.customRoom,
    });

    // 3. Emit WebSocket event cho tất cả client
    socketManager.emit('queue:checkin', {
      ticketId: String(data.id),
      patientName: data.patientName,
      dentistId: String(data.dentistId),
      status: data.status,
    });

    return res.status(201).json({
      success: true,
      message: 'Tiếp đón bệnh nhân vào hàng chờ thành công',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateTicketStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const ticketId = parseId(req.params.id);
    const { status } = UpdateStatusSchema.parse(req.body);

    // Map frontend 'In Chair' string to backend 'InChair' enum value
    let dbStatus: 'Waiting' | 'InChair' | 'Completed' = 'Waiting';
    if (status === 'InChair' || status === 'In Chair') {
      dbStatus = 'InChair';
    } else if (status === 'Completed') {
      dbStatus = 'Completed';
    }

    const data = await queuesService.updateTicketStatus(ticketId, dbStatus);

    // Emit WebSocket event cho tất cả client
    socketManager.emit('queue:status_changed', {
      ticketId: String(ticketId),
      newStatus: dbStatus,
      patientName: (data as any).patientName || '',
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái hàng chờ thành công',
      data,
    });
  } catch (err) {
    return next(err);
  }
}
