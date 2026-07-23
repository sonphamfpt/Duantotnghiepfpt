import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';

export interface FormattedQueueItem {
  id: string;
  patientId: string;
  patientName: string;
  dentistId: string;
  dentistName: string;
  room: string;
  status: 'Waiting' | 'In Chair' | 'Completed';
  checkInTime: string;
  waitTimeMin: number;
  elapsedTimeMin?: number;
  serviceName?: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export function formatQueueTicket(ticket: any): FormattedQueueItem {
  const localTime = new Date(ticket.checkInTime);
  const checkInTimeStr = `${pad(localTime.getHours())}:${pad(localTime.getMinutes())}`;

  let waitTimeMin = 0;
  let elapsedTimeMin = 0;

  if (ticket.status === 'Waiting') {
    const diffMs = Date.now() - new Date(ticket.checkInTime).getTime();
    waitTimeMin = Math.max(0, Math.floor(diffMs / 60000));
  } else if (ticket.status === 'InChair') {
    if (ticket.startTreatmentTime) {
      const waitMs = new Date(ticket.startTreatmentTime).getTime() - new Date(ticket.checkInTime).getTime();
      waitTimeMin = Math.max(0, Math.floor(waitMs / 60000));

      const elapsedMs = Date.now() - new Date(ticket.startTreatmentTime).getTime();
      elapsedTimeMin = Math.max(0, Math.floor(elapsedMs / 60000));
    }
  } else if (ticket.status === 'Completed') {
    if (ticket.startTreatmentTime && ticket.endTreatmentTime) {
      const waitMs = new Date(ticket.startTreatmentTime).getTime() - new Date(ticket.checkInTime).getTime();
      waitTimeMin = Math.max(0, Math.floor(waitMs / 60000));

      const elapsedMs = new Date(ticket.endTreatmentTime).getTime() - new Date(ticket.startTreatmentTime).getTime();
      elapsedTimeMin = Math.max(0, Math.floor(elapsedMs / 60000));
    }
  }

  // Map backend model status enum to frontend status format
  let statusStr: 'Waiting' | 'In Chair' | 'Completed' = 'Waiting';
  if (ticket.status === 'InChair') {
    statusStr = 'In Chair';
  } else if (ticket.status === 'Completed') {
    statusStr = 'Completed';
  }

  return {
    id: `Q-${ticket.ticketId}`,
    patientId: `P-${ticket.patientId}`,
    patientName: ticket.patient?.user?.fullName || 'Bệnh nhân',
    dentistId: `D-${ticket.dentistId.toString().padStart(2, '0')}`,
    dentistName: ticket.dentist?.user?.fullName || 'Bác sĩ',
    room: ticket.room?.name || 'Phòng khám',
    status: statusStr,
    checkInTime: checkInTimeStr,
    waitTimeMin,
    elapsedTimeMin,
    serviceName: ticket.service?.name || undefined,
  };
}

export async function getActiveTickets(): Promise<FormattedQueueItem[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tickets = await prisma.queueTicket.findMany({
    where: {
      checkInTime: { gte: today },
    },
    include: {
      patient: { include: { user: true } },
      dentist: { include: { user: true } },
      service: true,
      room: true,
    },
    orderBy: {
      checkInTime: 'asc',
    },
  });

  return tickets.map(formatQueueTicket);
}

export async function checkInPatient(data: {
  patientId: bigint;
  dentistId: bigint;
  serviceId?: bigint;
  appointmentId?: bigint;
  customRoom?: string;
}): Promise<FormattedQueueItem> {
  // 1. Kiểm tra xem bệnh nhân đã ở trong hàng chờ hôm nay chưa (ở trạng thái Waiting hoặc InChair)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const existing = await prisma.queueTicket.findFirst({
    where: {
      patientId: data.patientId,
      status: { in: ['Waiting', 'InChair'] },
      checkInTime: { gte: today },
    },
  });

  if (existing) {
    throw new AppError(400, 'PATIENT_ALREADY_IN_QUEUE', 'Bệnh nhân này đã có trong hàng chờ khám hôm nay.');
  }

  // [FIX 1] Kiểm tra lịch hẹn: nếu có appointmentId thì xác minh trạng thái
  if (data.appointmentId) {
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId: data.appointmentId },
    });

    if (!appointment) {
      throw new AppError(404, 'APPOINTMENT_NOT_FOUND', 'Không tìm thấy lịch hẹn tương ứng.');
    }

    if (appointment.status === 'Cancelled') {
      throw new AppError(
        400,
        'APPOINTMENT_CANCELLED',
        'Lịch hẹn này đã bị hủy. Không thể check-in bệnh nhân từ lịch hẹn đã hủy.'
      );
    }
  }

  // 2. Tìm bác sĩ để lấy phòng khám mặc định
  const dentist = await prisma.dentist.findUnique({
    where: { dentistId: data.dentistId },
    include: { user: true },
  });
  
  if (!dentist) {
    throw new AppError(440, 'DENTIST_NOT_FOUND', 'Bác sĩ không tồn tại.');
  }

  // Khảo sát phòng khám
  let roomId = dentist.defaultRoomId;
  if (data.customRoom) {
    const room = await prisma.room.findFirst({
      where: { name: data.customRoom },
    });
    if (room) {
      roomId = room.roomId;
    }
  }

  // 3. Tạo ticket hàng chờ mới
  const ticket = await prisma.queueTicket.create({
    data: {
      patientId: data.patientId,
      dentistId: data.dentistId,
      serviceId: data.serviceId || null,
      appointmentId: data.appointmentId || null,
      roomId: roomId,
      status: 'Waiting',
    },
    include: {
      patient: { include: { user: true } },
      dentist: { include: { user: true } },
      service: true,
      room: true,
    },
  });

  // [FIX 2] Đồng bộ: cập nhật Appointment.status → InProgress sau khi tạo QueueTicket
  if (data.appointmentId) {
    try {
      await prisma.appointment.update({
        where: { appointmentId: data.appointmentId },
        data: { status: 'InProgress' },
      });
    } catch (syncErr) {
      console.error('Lỗi đồng bộ trạng thái lịch hẹn sang InProgress:', syncErr);
    }
  }

  try {
    await prisma.systemLog.create({
      data: {
        module: 'RECEPTION',
        logType: 'SUCCESS',
        message: `Bệnh nhân ${ticket.patient.fullName} check-in vào hàng chờ bác sĩ ${ticket.dentist.user.fullName}.`,
      },
    });
  } catch (logErr) {
    console.error('Lỗi ghi log checkin:', logErr);
  }

  return formatQueueTicket(ticket);
}

export async function updateTicketStatus(
  ticketId: bigint,
  newStatus: 'Waiting' | 'InChair' | 'Completed'
): Promise<FormattedQueueItem> {
  const ticket = await prisma.queueTicket.findUnique({
    where: { ticketId },
  });

  if (!ticket) {
    throw new AppError(444, 'TICKET_NOT_FOUND', 'Số thứ tự hàng chờ không tồn tại.');
  }

  const updateData: any = { status: newStatus };
  if (newStatus === 'InChair') {
    updateData.startTreatmentTime = new Date();
  } else if (newStatus === 'Completed') {
    updateData.endTreatmentTime = new Date();
  }

  const updated = await prisma.queueTicket.update({
    where: { ticketId },
    data: updateData,
    include: {
      patient: { include: { user: true } },
      dentist: { include: { user: true } },
      service: true,
      room: true,
    },
  });

  try {
    let msg = '';
    if (newStatus === 'InChair') {
      msg = `Bác sĩ ${updated.dentist.user.fullName} bắt đầu khám cho bệnh nhân ${updated.patient.fullName}.`;
    } else if (newStatus === 'Completed') {
      msg = `Hoàn tất ca khám cho bệnh nhân ${updated.patient.fullName} tại ${updated.room?.name || 'phòng khám'}.`;
    } else {
      msg = `Hàng chờ của bệnh nhân ${updated.patient.fullName} được chuyển về trạng thái chờ khám.`;
    }
    await prisma.systemLog.create({
      data: {
        module: newStatus === 'InChair' ? 'DENTIST' : 'SYSTEM',
        logType: 'SUCCESS',
        message: msg,
      },
    });
  } catch (logErr) {
    console.error('Lỗi ghi log chuyển trạng thái hàng chờ:', logErr);
  }

  return formatQueueTicket(updated);
}
