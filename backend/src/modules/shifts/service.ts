import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';

/**
 * Quét tự động các lịch hẹn bị xung đột trùng với khung ca trực được hoán đổi/chuyển giao
 */
async function detectAndCreateConflicts(
  tx: any,
  shift: { workDate: Date; startTime: Date; endTime: Date; shiftType: string },
  originalDentistId: bigint,
  newDentistId: bigint
) {
  const year = shift.workDate.getUTCFullYear();
  const month = shift.workDate.getUTCMonth();
  const day = shift.workDate.getUTCDate();

  const startHours = shift.startTime.getUTCHours();
  const startMinutes = shift.startTime.getUTCMinutes();

  const endHours = shift.endTime.getUTCHours();
  const endMinutes = shift.endTime.getUTCMinutes();

  // Phòng khám hoạt động ở Việt Nam (UTC+7), cần trừ 7 giờ để đổi giờ làm việc local sang giờ UTC lưu trong DB
  const VIETNAM_OFFSET_HOURS = 7;
  const shiftStartUtc = new Date(Date.UTC(year, month, day, startHours - VIETNAM_OFFSET_HOURS, startMinutes));
  const shiftEndUtc = new Date(Date.UTC(year, month, day, endHours - VIETNAM_OFFSET_HOURS, endMinutes));

  // Tìm các lịch hẹn được đặt cho bác sĩ ban đầu nằm trong khung thời gian ca trực
  const affectedAppointments = await tx.appointment.findMany({
    where: {
      dentistId: originalDentistId,
      status: { notIn: ['Cancelled', 'NoShow'] },
      startTime: { lt: shiftEndUtc },
      endTime: { gt: shiftStartUtc },
    },
    include: {
      patient: { include: { user: true } },
      service: true,
    },
  });

  if (affectedAppointments.length === 0) return null;

  // Tạo thông báo đổi ca trực
  const notif = await tx.shiftChangeNotification.create({
    data: {
      shiftDate: shift.workDate,
      shiftType: shift.shiftType,
      originalDentistId,
      newDentistId,
    },
  });

  // Tạo liên kết các cuộc hẹn bị ảnh hưởng
  await tx.shiftChangeAffectedItem.createMany({
    data: affectedAppointments.map((appt: any) => ({
      notifId: notif.notifId,
      appointmentId: appt.appointmentId,
      resolved: false,
    })),
  });

  // Ghi nhận log cảnh báo
  await tx.systemLog.create({
    data: {
      module: 'SYSTEM',
      logType: 'WARN',
      message: `Đổi ca trực tạo thông báo SCN-${notif.notifId}: Cần xử lý ${affectedAppointments.length} lịch hẹn bị xung đột.`,
    },
  });

  return notif;
}

/**
 * Lấy danh sách ca trực bác sĩ (có hỗ trợ lọc dentistId và khoảng ngày)
 */
export async function getShifts(filters: { dentistId?: bigint; startDate?: Date; endDate?: Date }) {
  return await prisma.dentistShift.findMany({
    where: {
      dentistId: filters.dentistId || undefined,
      workDate: filters.startDate && filters.endDate ? {
        gte: filters.startDate,
        lte: filters.endDate,
      } : undefined,
    },
    include: {
      dentist: { include: { user: true } },
      room: true,
    },
    orderBy: {
      workDate: 'asc',
    },
  });
}

/**
 * Tạo mới hoặc cập nhật một ca trực
 */
export async function createShift(data: {
  dentistId: bigint;
  workDate: Date;
  shiftType: 'Morning' | 'Afternoon' | 'Full';
  roomId: number;
}) {
  const shiftHours = {
    Morning: { start: '08:00', end: '12:00' },
    Afternoon: { start: '14:00', end: '17:30' },
    Full: { start: '08:00', end: '17:30' },
  };

  const sc = shiftHours[data.shiftType];

  return await prisma.dentistShift.upsert({
    where: {
      dentistId_workDate_shiftType: {
        dentistId: data.dentistId,
        workDate: data.workDate,
        shiftType: data.shiftType,
      },
    },
    update: {
      roomId: data.roomId,
      startTime: new Date(`1970-01-01T${sc.start}:00.000Z`),
      endTime: new Date(`1970-01-01T${sc.end}:00.000Z`),
      isActive: true,
    },
    create: {
      dentistId: data.dentistId,
      roomId: data.roomId,
      workDate: data.workDate,
      shiftType: data.shiftType,
      startTime: new Date(`1970-01-01T${sc.start}:00.000Z`),
      endTime: new Date(`1970-01-01T${sc.end}:00.000Z`),
      isActive: true,
    },
  });
}

/**
 * Hoán đổi ca trực (Swap) giữa hai ca của hai bác sĩ khác nhau
 */
export async function swapShifts(shiftId1: bigint, shiftId2: bigint) {
  return await prisma.$transaction(async (tx) => {
    const shift1 = await tx.dentistShift.findUnique({
      where: { shiftId: shiftId1 },
      include: { dentist: { include: { user: true } } },
    });
    const shift2 = await tx.dentistShift.findUnique({
      where: { shiftId: shiftId2 },
      include: { dentist: { include: { user: true } } },
    });

    if (!shift1 || !shift2) {
      throw new AppError(404, 'SHIFT_NOT_FOUND', 'Một trong hai ca trực không tồn tại.');
    }

    // 1. Phát hiện và tạo các thông báo xung đột lịch hẹn
    await detectAndCreateConflicts(tx, shift1, shift1.dentistId, shift2.dentistId);
    await detectAndCreateConflicts(tx, shift2, shift2.dentistId, shift1.dentistId);

    // 2. Cập nhật hoán đổi ca trực trên database (sử dụng ngày tạm để tránh lỗi Unique constraint)
    await tx.dentistShift.update({
      where: { shiftId: shiftId1 },
      data: { workDate: new Date('1970-01-01T00:00:00.000Z') },
    });

    await tx.dentistShift.update({
      where: { shiftId: shiftId2 },
      data: { dentistId: shift1.dentistId },
    });

    await tx.dentistShift.update({
      where: { shiftId: shiftId1 },
      data: {
        dentistId: shift2.dentistId,
        workDate: shift1.workDate,
      },
    });

    // 3. Ghi nhận log
    await tx.systemLog.create({
      data: {
        module: 'SYSTEM',
        logType: 'SUCCESS',
        message: `Hoán đổi ca trực thành công giữa Bác sĩ ${shift1.dentist.user.fullName} và Bác sĩ ${shift2.dentist.user.fullName} ngày ${shift1.workDate.toISOString().split('T')[0]}.`,
      },
    });

    return { message: 'Hoán đổi ca trực thành công' };
  });
}

/**
 * Chuyển giao ca trực (Transfer) từ một bác sĩ trực sang bác sĩ khác
 */
export async function transferShift(shiftId: bigint, targetDentistId: bigint) {
  return await prisma.$transaction(async (tx) => {
    const shift = await tx.dentistShift.findUnique({
      where: { shiftId },
      include: { dentist: { include: { user: true } } },
    });

    const targetDentist = await tx.dentist.findUnique({
      where: { dentistId: targetDentistId },
      include: { user: true },
    });

    if (!shift) {
      throw new AppError(404, 'SHIFT_NOT_FOUND', 'Ca trực không tồn tại.');
    }
    if (!targetDentist) {
      throw new AppError(404, 'DENTIST_NOT_FOUND', 'Bác sĩ nhận ca trực không tồn tại.');
    }

    // 1. Quét tìm và lưu trữ thông tin lịch hẹn bị ảnh hưởng
    await detectAndCreateConflicts(tx, shift, shift.dentistId, targetDentistId);

    // 2. Cập nhật chuyển giao ca trực
    await tx.dentistShift.update({
      where: { shiftId },
      data: { dentistId: targetDentistId },
    });

    // 3. Ghi nhận log
    await tx.systemLog.create({
      data: {
        module: 'SYSTEM',
        logType: 'SUCCESS',
        message: `Chuyển ca trực thành công từ Bác sĩ ${shift.dentist.user.fullName} sang Bác sĩ ${targetDentist.user.fullName} ngày ${shift.workDate.toISOString().split('T')[0]}.`,
      },
    });

    return { message: 'Chuyển ca trực thành công' };
  });
}

/**
 * Lấy danh sách các thông báo đổi ca kèm lịch hẹn bị ảnh hưởng chi tiết
 */
export async function getShiftNotifications() {
  return await prisma.shiftChangeNotification.findMany({
    include: {
      originalDentist: { include: { user: true } },
      newDentist: { include: { user: true } },
      affectedItems: {
        include: {
          appointment: {
            include: {
              patient: { include: { user: true } },
              service: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Lễ tân xử lý từng lịch hẹn bị ảnh hưởng (Bệnh nhân đồng ý -> Cập nhật bác sĩ trực mới; Bệnh nhân từ chối -> Hủy lịch hẹn)
 */
export async function resolveConflictItem(
  notifId: bigint,
  appointmentId: bigint,
  action: 'updated' | 'cancelled'
) {
  return await prisma.$transaction(async (tx) => {
    const affectedItem = await tx.shiftChangeAffectedItem.findFirst({
      where: {
        notifId,
        appointmentId,
      },
      include: {
        notification: true,
        appointment: {
          include: {
            patient: { include: { user: true } },
          },
        },
      },
    });

    if (!affectedItem) {
      throw new AppError(404, 'AFFECTED_ITEM_NOT_FOUND', 'Lịch hẹn bị ảnh hưởng không thuộc thông báo này.');
    }

    if (affectedItem.resolved) {
      throw new AppError(400, 'ALREADY_RESOLVED', 'Lịch hẹn này đã được giải quyết.');
    }

    if (action === 'updated') {
      // Bệnh nhân đồng ý -> Đổi bác sĩ sang bác sĩ nhận ca trực mới
      await tx.appointment.update({
        where: { appointmentId },
        data: { dentistId: affectedItem.notification.newDentistId },
      });

      await tx.shiftChangeAffectedItem.update({
        where: { id: affectedItem.id },
        data: {
          resolved: true,
          resolvedAction: 'updated',
        },
      });

      await tx.systemLog.create({
        data: {
          module: 'RECEPTION',
          logType: 'SUCCESS',
          message: `Lễ tân cập nhật lịch hẹn ${appointmentId} của ${affectedItem.appointment.patient.fullName}: chuyển sang Bác sĩ mới (đã đồng ý).`,
        },
      });
    } else if (action === 'cancelled') {
      // Bệnh nhân từ chối -> Hủy lịch hẹn
      await tx.appointment.update({
        where: { appointmentId },
        data: { status: 'Cancelled' },
      });

      await tx.shiftChangeAffectedItem.update({
        where: { id: affectedItem.id },
        data: {
          resolved: true,
          resolvedAction: 'cancelled',
        },
      });

      await tx.systemLog.create({
        data: {
          module: 'RECEPTION',
          logType: 'WARN',
          message: `Hủy lịch hẹn ${appointmentId} của ${affectedItem.appointment.patient.fullName} do không đồng ý đổi bác sĩ.`,
        },
      });
    }

    return { success: true };
  });
}
