import { Prisma, ShiftType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { socketManager } from '../../config/socket';

/**
 * Quét tự động các lịch hẹn bị xung đột trùng với khung ca trực được hoán đổi/chuyển giao
 */
async function detectAndCreateConflicts(
  tx: Prisma.TransactionClient,
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

  const VIETNAM_OFFSET_HOURS = 7;
  const shiftStartUtc = new Date(Date.UTC(year, month, day, startHours - VIETNAM_OFFSET_HOURS, startMinutes));
  const shiftEndUtc = new Date(Date.UTC(year, month, day, endHours - VIETNAM_OFFSET_HOURS, endMinutes));

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

  // Không có lịch hẹn nào bị ảnh hưởng → không tạo thông báo
  if (affectedAppointments.length === 0) return null;

  // Tạo thông báo đổi ca trực (chỉ khi có lịch hẹn bị ảnh hưởng)
  const notif = await tx.shiftChangeNotification.create({
    data: {
      shiftDate: shift.workDate,
      shiftType: shift.shiftType as any,
      originalDentistId,
      newDentistId,
    },
  });

  await tx.shiftChangeAffectedItem.createMany({
    data: affectedAppointments.map((appt) => ({
      notifId: notif.notifId,
      appointmentId: appt.appointmentId,
      resolved: false,
    })),
  });

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
  roomId?: number | string;
}) {
  // 1. Validate ca trong quá khứ & real-time ngày hôm nay
  const now = new Date();
  const todayStr = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const currentHourVn = parseInt(now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false }).split(':')[0], 10);
  const workDateStr = data.workDate.toISOString().split('T')[0];

  if (workDateStr < todayStr) {
    throw new AppError(400, 'Không thể xếp ca trực cho ngày trong quá khứ.', 'PAST_SHIFT_INVALID');
  }

  if (workDateStr === todayStr) {
    const startHour = data.shiftType === 'Afternoon' ? 14 : 8;
    if (currentHourVn >= startHour) {
      throw new AppError(
        400,
        `Ca trực (${data.shiftType === 'Morning' ? 'Ca sáng' : data.shiftType === 'Afternoon' ? 'Ca chiều' : 'Ca cả ngày'}) ngày hôm nay đã bắt đầu hoặc trôi qua (${startHour}:00). Không thể tạo ca mới.`,
        'SHIFT_STARTED_REALTIME'
      );
    }
  }

  // 2. Validate xung đột ca trực của Bác sĩ trong cùng một ngày
  const existingShifts = await prisma.dentistShift.findMany({
    where: {
      dentistId: data.dentistId,
      workDate: data.workDate,
      isActive: true,
    },
  });

  const hasMorning = existingShifts.some(s => s.shiftType === 'Morning');
  const hasAfternoon = existingShifts.some(s => s.shiftType === 'Afternoon');
  const hasFull = existingShifts.some(s => s.shiftType === 'Full');

  if (hasFull) {
    throw new AppError(400, 'Bác sĩ đã có Ca cả ngày vào ngày này. Không thể xếp thêm ca trực khác.', 'DOCTOR_HAS_FULL_SHIFT');
  }

  if (hasMorning && hasAfternoon) {
    throw new AppError(400, 'Bác sĩ đã có đủ cả Ca sáng và Ca chiều vào ngày này. Không thể thêm ca trực nữa.', 'DOCTOR_FULL_DAY_SCHEDULED');
  }

  if ((hasMorning || hasAfternoon) && data.shiftType === 'Full') {
    throw new AppError(400, 'Bác sĩ đã có ca trực lẻ trong ngày. Không thể đăng ký thêm Ca cả ngày.', 'CANNOT_ADD_FULL_SHIFT');
  }

  if (data.shiftType === 'Morning' && hasMorning) {
    throw new AppError(400, 'Bác sĩ đã có Ca sáng vào ngày này.', 'DUPLICATE_SHIFT');
  }

  if (data.shiftType === 'Afternoon' && hasAfternoon) {
    throw new AppError(400, 'Bác sĩ đã có Ca chiều vào ngày này.', 'DUPLICATE_SHIFT');
  }


  const shiftHours = {
    Morning: { start: '08:00', end: '14:00' },
    Afternoon: { start: '14:00', end: '20:00' },
    Full: { start: '08:00', end: '20:00' },
  };

  const sc = shiftHours[data.shiftType];

  // Tự động tìm phòng cố định của bác sĩ qua defaultRoomId
  let finalRoomId = 1;
  if (!data.roomId) {
    // Không gửi roomId → tự lookup qua Dentist.defaultRoomId
    const dentist = await prisma.dentist.findUnique({
      where: { dentistId: data.dentistId },
      select: { defaultRoomId: true },
    });
    if (dentist?.defaultRoomId) {
      finalRoomId = dentist.defaultRoomId;
    }
  } else if (typeof data.roomId === 'string') {
    const room = await prisma.room.findFirst({
      where: { name: data.roomId },
    });
    if (room) {
      finalRoomId = room.roomId;
    } else {
      // Tên phòng không khớp → fallback lookup qua Dentist.defaultRoomId
      const dentist = await prisma.dentist.findUnique({
        where: { dentistId: data.dentistId },
        select: { defaultRoomId: true },
      });
      if (dentist?.defaultRoomId) finalRoomId = dentist.defaultRoomId;
    }
  } else {
    finalRoomId = Number(data.roomId);
  }

  return await prisma.dentistShift.upsert({
    where: {
      dentistId_workDate_shiftType: {
        dentistId: data.dentistId,
        workDate: data.workDate,
        shiftType: data.shiftType,
      },
    },
    update: {
      roomId: finalRoomId,
      startTime: new Date(`1970-01-01T${sc.start}:00.000Z`),
      endTime: new Date(`1970-01-01T${sc.end}:00.000Z`),
      isActive: true,
    },
    create: {
      dentistId: data.dentistId,
      roomId: finalRoomId,
      workDate: data.workDate,
      shiftType: data.shiftType,
      startTime: new Date(`1970-01-01T${sc.start}:00.000Z`),
      endTime: new Date(`1970-01-01T${sc.end}:00.000Z`),
      isActive: true,
    },
  });
}


/**
 * Tính timestamp chính xác (UTC ms) của giờ bắt đầu ca trực theo giờ Việt Nam (UTC+7)
 */
function getShiftStartTimeMs(workDate: Date, shiftType: string): number {
  const year = workDate.getUTCFullYear();
  const month = workDate.getUTCMonth();
  const day = workDate.getUTCDate();

  // Ca Chiều bắt đầu 14:00 (VN) = 07:00 (UTC). Ca Sáng bắt đầu 08:00 (VN) = 01:00 (UTC)
  const startHourUtc = shiftType === 'Afternoon' ? 7 : 1;
  return Date.UTC(year, month, day, startHourUtc, 0, 0, 0);
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
      throw new AppError(404, 'Một trong hai ca trực không tồn tại.', 'SHIFT_NOT_FOUND');
    }

    if (!shift1.isActive || !shift2.isActive) {
      throw new AppError(400, 'Một trong hai ca trực đã bị hủy hoặc không còn hoạt động.', 'SHIFT_INACTIVE');
    }

    if (shift1.dentistId === shift2.dentistId) {
      throw new AppError(400, 'Không thể hoán đổi ca trực với chính bản thân mình.', 'SAME_DOCTOR_SWAP_INVALID');
    }

    if (!shift1.dentist.isActive || shift1.dentist.user.status !== 'Active' || !shift2.dentist.isActive || shift2.dentist.user.status !== 'Active') {
      throw new AppError(400, 'Một trong hai bác sĩ đã nghỉ việc hoặc tài khoản đã bị khóa.', 'DOCTOR_INACTIVE');
    }

    // Kiểm tra quy chế: Phải gửi yêu cầu trước ít nhất 12 tiếng
    const nowMs = Date.now();
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    const start1Ms = getShiftStartTimeMs(shift1.workDate, shift1.shiftType);
    if (start1Ms - nowMs < TWELVE_HOURS_MS) {
      throw new AppError(400, 'Ca trực của bạn phải còn ít nhất 12 tiếng mới tới giờ bắt đầu để thực hiện hoán đổi.', 'SWAP_TOO_LATE');
    }

    const start2Ms = getShiftStartTimeMs(shift2.workDate, shift2.shiftType);
    if (start2Ms - nowMs < TWELVE_HOURS_MS) {
      throw new AppError(400, 'Ca trực muốn hoán đổi phải còn ít nhất 12 tiếng mới tới giờ bắt đầu.', 'SWAP_TOO_LATE');
    }

    // 1. Kiểm tra không cho hoán đổi giữa 2 ca giống hệt nhau trong cùng một ngày
    const date1Str = shift1.workDate.toISOString().slice(0, 10);
    const date2Str = shift2.workDate.toISOString().slice(0, 10);

    if (date1Str === date2Str && shift1.shiftType === shift2.shiftType) {
      const shiftName = shift1.shiftType === 'Morning' ? 'Ca Sáng' : shift1.shiftType === 'Afternoon' ? 'Ca Chiều' : 'Ca Cả ngày';
      throw new AppError(400, `Cả hai bác sĩ đều đã có lịch trực ${shiftName} vào ngày ${date1Str}. Không thể hoán đổi 2 ca trùng nhau.`, 'SAME_SHIFT_SWAP_INVALID');
    }

    // 2. Kiểm tra xung đột trùng ca trực: Bác sĩ 1 không được trùng ca với ca 2, Bác sĩ 2 không được trùng ca với ca 1
    const shift1OverlapTypes: ShiftType[] = shift1.shiftType === 'Full' ? [ShiftType.Morning, ShiftType.Afternoon, ShiftType.Full] : [shift1.shiftType as ShiftType, ShiftType.Full];
    const shift2OverlapTypes: ShiftType[] = shift2.shiftType === 'Full' ? [ShiftType.Morning, ShiftType.Afternoon, ShiftType.Full] : [shift2.shiftType as ShiftType, ShiftType.Full];

    const existingShiftDoc1OnDate2 = await tx.dentistShift.findFirst({
      where: {
        dentistId: shift1.dentistId,
        workDate: shift2.workDate,
        shiftType: { in: shift2OverlapTypes },
        isActive: true,
        shiftId: { notIn: [shiftId1, shiftId2] },
      },
    });
    if (existingShiftDoc1OnDate2) {
      throw new AppError(400, `Bác sĩ ${shift1.dentist.user.fullName} đã có ca trực trùng giờ vào ngày ${shift2.workDate.toISOString().slice(0, 10)}. Không thể hoán đổi.`, 'SWAP_CONFLICT_DOCTOR_1');
    }

    const existingShiftDoc2OnDate1 = await tx.dentistShift.findFirst({
      where: {
        dentistId: shift2.dentistId,
        workDate: shift1.workDate,
        shiftType: { in: shift1OverlapTypes },
        isActive: true,
        shiftId: { notIn: [shiftId1, shiftId2] },
      },
    });
    if (existingShiftDoc2OnDate1) {
      throw new AppError(400, `Bác sĩ ${shift2.dentist.user.fullName} đã có ca trực trùng giờ vào ngày ${shift1.workDate.toISOString().slice(0, 10)}. Không thể hoán đổi.`, 'SWAP_CONFLICT_DOCTOR_2');
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
      throw new AppError(404, 'Ca trực không tồn tại.', 'SHIFT_NOT_FOUND');
    }
    if (!shift.isActive) {
      throw new AppError(400, 'Ca trực đã bị hủy hoặc không còn hoạt động.', 'SHIFT_INACTIVE');
    }

    if (!targetDentist) {
      throw new AppError(404, 'Bác sĩ nhận ca trực không tồn tại.', 'DENTIST_NOT_FOUND');
    }

    if (shift.dentistId === targetDentistId) {
      throw new AppError(400, 'Không thể chuyển giao ca trực cho chính bản thân mình.', 'SAME_DOCTOR_TRANSFER_INVALID');
    }

    if (!shift.dentist.isActive || shift.dentist.user.status !== 'Active' || !targetDentist.isActive || targetDentist.user.status !== 'Active') {
      throw new AppError(400, 'Bác sĩ chuyển ca hoặc nhận ca đã nghỉ việc hoặc tài khoản đã bị khóa.', 'DOCTOR_INACTIVE');
    }

    // Kiểm tra quy chế: Phải gửi yêu cầu trước ít nhất 12 tiếng
    const nowMs = Date.now();
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    const startMs = getShiftStartTimeMs(shift.workDate, shift.shiftType);
    if (startMs - nowMs < TWELVE_HOURS_MS) {
      throw new AppError(400, 'Ca trực của bạn phải còn ít nhất 12 tiếng mới tới giờ bắt đầu để nhờ trực thay.', 'TRANSFER_TOO_LATE');
    }

    // Kiểm tra xung đột ca trực của Bác sĩ nhận ca:
    // Ca Sáng (08:00-14:00) xung đột với Ca Sáng & Ca Cả Ngày.
    // Ca Chiều (14:00-20:00) xung đột với Ca Chiều & Ca Cả Ngày.
    // Ca Cả Ngày (08:00-20:00) xung đột với mọi ca trong ngày.
    const overlappingShiftTypes: ShiftType[] = shift.shiftType === 'Full'
      ? [ShiftType.Morning, ShiftType.Afternoon, ShiftType.Full]
      : [shift.shiftType as ShiftType, ShiftType.Full];

    const existingShiftTarget = await tx.dentistShift.findFirst({
      where: {
        dentistId: targetDentistId,
        workDate: shift.workDate,
        shiftType: { in: overlappingShiftTypes },
        isActive: true,
      },
    });

    if (existingShiftTarget) {
      const shiftName = shift.shiftType === 'Morning' ? 'Ca sáng' : shift.shiftType === 'Afternoon' ? 'Ca chiều' : 'Ca cả ngày';
      const targetShiftName = existingShiftTarget.shiftType === 'Morning' ? 'Ca sáng' : existingShiftTarget.shiftType === 'Afternoon' ? 'Ca chiều' : 'Ca cả ngày';
      throw new AppError(
        400,
        `Bác sĩ ${targetDentist.user.fullName} đã có lịch trực (${targetShiftName}) trùng giờ với ${shiftName} ngày ${shift.workDate.toISOString().slice(0, 10)}. Không thể nhờ trực thay.`,
        'TARGET_DENTIST_HAS_SHIFT'
      );
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
          message: `Lễ tân cập nhật lịch hẹn ${appointmentId} của ${affectedItem.appointment.patient.user.fullName}: chuyển sang Bác sĩ mới (đã đồng ý).`,
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
          message: `Hủy lịch hẹn ${appointmentId} của ${affectedItem.appointment.patient.user.fullName} do không đồng ý đổi bác sĩ.`,
        },
      });
    }

    return { success: true };
  });
}

/**
 * Xóa một ca trực của bác sĩ (Kiểm tra nếu có lịch hẹn đã được đặt sẽ chặn xóa)
 */
export async function deleteShift(shiftId: bigint) {
  const shift = await prisma.dentistShift.findUnique({
    where: { shiftId },
  });

  if (!shift) {
    throw new AppError(404, 'Không tìm thấy ca trực cần xóa.', 'SHIFT_NOT_FOUND');
  }

  const year = shift.workDate.getUTCFullYear();
  const month = shift.workDate.getUTCMonth();
  const day = shift.workDate.getUTCDate();

  const startHours = shift.startTime.getUTCHours();
  const startMinutes = shift.startTime.getUTCMinutes();

  const endHours = shift.endTime.getUTCHours();
  const endMinutes = shift.endTime.getUTCMinutes();

  const VIETNAM_OFFSET_HOURS = 7;
  const shiftStartUtc = new Date(Date.UTC(year, month, day, startHours - VIETNAM_OFFSET_HOURS, startMinutes));
  const shiftEndUtc = new Date(Date.UTC(year, month, day, endHours - VIETNAM_OFFSET_HOURS, endMinutes));

  const nowMs = Date.now();
  const shiftStartMs = shiftStartUtc.getTime();
  const shiftEndMs = shiftEndUtc.getTime();

  // 1. Chặn xóa nếu ca trực đang trong giờ làm việc của bác sĩ
  if (nowMs >= shiftStartMs && nowMs <= shiftEndMs) {
    throw new AppError(
      400,
      `Không thể xóa ca trực vì ca làm việc đang trong thời gian diễn ra (${shift.shiftType === 'Morning' ? '08:00 - 14:00' : shift.shiftType === 'Afternoon' ? '14:00 - 20:00' : '08:00 - 20:00'}). Bác sĩ đang trong ca trực.`,
      'CURRENT_SHIFT_ACTIVE'
    );
  }

  // 2. Chặn xóa nếu ca trực có lịch hẹn đang diễn ra hoặc đã xác nhận
  const activeAppointmentsCount = await prisma.appointment.count({
    where: {
      dentistId: shift.dentistId,
      status: { in: ['Confirmed', 'InProgress'] },
      startTime: { lt: shiftEndUtc },
      endTime: { gt: shiftStartUtc },
    },
  });

  if (activeAppointmentsCount > 0) {
    throw new AppError(
      400,
      `Không thể xóa ca trực vì đã có ${activeAppointmentsCount} lịch hẹn đang chờ/đang khám trong ca này. Vui lòng hoán đổi ca trực hoặc chuyển ca trực trước.`,
      'SHIFT_HAS_APPOINTMENTS'
    );
  }



  const todayStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0];
  const shiftDateStr = shift.workDate.toISOString().split('T')[0];
  const isPastShift = shiftDateStr < todayStr;

  if (isPastShift) {
    // Ca trong quá khứ chỉ thực hiện xóa mềm (soft delete - ẩn khỏi giao diện nhưng giữ lịch sử)
    await prisma.dentistShift.update({
      where: { shiftId },
      data: { isActive: false },
    });

    await prisma.systemLog.create({
      data: {
        module: 'SYSTEM',
        logType: 'WARN',
        message: `Đã xóa mềm (chuyển ẩn) ca trực lịch sử ID ${shiftId} của bác sĩ ID ${shift.dentistId} ngày ${shiftDateStr}.`,
      },
    });

    return { success: true, message: 'Đã xóa mềm ca trực quá khứ thành công (Lưu lịch sử).' };
  }

  await prisma.dentistShift.delete({
    where: { shiftId },
  });

  await prisma.systemLog.create({
    data: {
      module: 'SYSTEM',
      logType: 'WARN',
      message: `Đã xóa ca trực ID ${shiftId} của bác sĩ ID ${shift.dentistId} vào ngày ${shiftDateStr}.`,
    },
  });

  return { success: true, message: 'Xóa ca trực thành công.' };
}

/**
 * Cập nhật phòng trực cho một ca (manager)
 */
export async function updateShiftRoom(shiftId: bigint, roomId: number) {
  const shift = await prisma.dentistShift.findUnique({ where: { shiftId } });
  if (!shift) {
    throw new AppError(404, 'Không tìm thấy ca trực.', 'SHIFT_NOT_FOUND');
  }

  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const shiftDateStr = shift.workDate.toISOString().split('T')[0];
  if (shiftDateStr < todayStr) {
    throw new AppError(400, 'PAST_SHIFT_EDIT_LOCKED', 'Ca trực trong quá khứ đã hoàn tất. Không thể thay đổi phòng khám.');
  }

  return await prisma.dentistShift.update({
    where: { shiftId },
    data: { roomId },
  });
}


