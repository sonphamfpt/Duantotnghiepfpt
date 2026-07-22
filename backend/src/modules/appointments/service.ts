import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { AppError } from '../../middlewares/errorHandler';
import { calculateAvailableSlots } from '../../utils/slotCalculator';
import { Prisma } from '@prisma/client';
import { socketManager } from '../../config/socket';

async function resolveServiceId(id: string): Promise<bigint> {
  const cleanId = id.replace('S-', '');
  
  if (/^\d+$/.test(cleanId)) {
    const record = await prisma.service.findUnique({
      where: { serviceId: BigInt(cleanId) },
    });
    if (record) return record.serviceId;
  }
  
  // Tra cứu theo tên dịch vụ nếu không tìm được qua numeric ID
  const record = await prisma.service.findFirst({
    where: { name: { contains: id, mode: 'insensitive' } },
  });
  
  if (!record) {
    throw new AppError(404, `Không tìm thấy dịch vụ tương ứng với mã: ${id}`, 'SERVICE_NOT_FOUND');
  }
  return record.serviceId;
}

async function resolveDentistId(id: string): Promise<bigint> {
  const cleanId = id.replace('D-', '');
  
  if (/^\d+$/.test(cleanId)) {
    const record = await prisma.dentist.findUnique({
      where: { dentistId: BigInt(cleanId) },
    });
    if (record) return record.dentistId;
  }
  
  // Tra cứu theo tên bác sĩ nếu không tìm được qua numeric ID
  const record = await prisma.dentist.findFirst({
    where: {
      user: { fullName: { contains: id, mode: 'insensitive' } }
    }
  });
  
  if (!record) {
    throw new AppError(404, `Không tìm thấy bác sĩ tương ứng với mã: ${id}`, 'DENTIST_NOT_FOUND');
  }
  return record.dentistId;
}

function getVietnamDateStr(date: Date): string {
  const vietnamDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamDate.toISOString().split('T')[0];
}

function getVietnamDayUtcRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000+07:00`),
    end: new Date(`${dateStr}T23:59:59.999+07:00`),
  };
}

export class AppointmentsService {
  /**
   * Lấy danh sách các khung giờ trống của bác sĩ trong ngày
   */
  async getAvailableSlots(dentistIdInput: string, dateStr: string, serviceIdInput: string): Promise<string[]> {
    const dentistIdVal = await resolveDentistId(dentistIdInput);
    const serviceIdVal = await resolveServiceId(serviceIdInput);
    const dentistId = dentistIdVal.toString();
    const serviceId = serviceIdVal.toString();

    const isToday = dateStr === getVietnamDateStr(new Date());
    const cacheKey = `slots:${dentistId}:${dateStr}:${serviceId}`;
    
    // 1. Kiểm tra cache Redis
    const cachedSlots = isToday ? null : await redis.get(cacheKey);
    if (cachedSlots) {
      console.log(`⚡ Available slots hit cache for key: ${cacheKey}`);
      return JSON.parse(cachedSlots);
    }

    // 2. Lấy thông tin ca trực của bác sĩ (dùng khoảng giờ trong ngày để tránh lệch múi giờ)
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const shifts = await prisma.dentistShift.findMany({
      where: {
        dentistId: dentistIdVal,
        workDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        isActive: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    if (shifts.length === 0) {
      return []; // Bác sĩ không có ca trực nào trong ngày này
    }

    // 3. Lấy giờ mở cửa & nghỉ trưa của phòng khám dựa trên thứ trong tuần
    const weekday = new Date(dateStr).getUTCDay(); // 0 = Chủ Nhật, 1 = Thứ Hai, ...
    const operatingHour = await prisma.clinicOperatingHour.findUnique({
      where: { weekday },
    });

    if (!operatingHour || operatingHour.isClosed) {
      return []; // Phòng khám đóng cửa vào ngày này
    }

    // 4. Lấy thông tin dịch vụ (để lấy thời lượng duration + buffer)
    const service = await prisma.service.findUnique({
      where: { serviceId: serviceIdVal, isActive: true },
    });

    if (!service) {
      throw new AppError(404, 'Dịch vụ không tồn tại hoặc đã bị khóa.', 'SERVICE_NOT_FOUND');
    }

    // 5. Lấy danh sách lịch hẹn đã được đặt của bác sĩ trong ngày (trừ trạng thái đã hủy)
    const dayRange = getVietnamDayUtcRange(dateStr);
    const appointments = await prisma.appointment.findMany({
      where: {
        dentistId: dentistIdVal,
        startTime: {
          gte: dayRange.start,
          lte: dayRange.end,
        },
        status: {
          notIn: ['Cancelled', 'NoShow'],
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // 6. Phòng khám vận hành liên tục 08:00-20:00, không chặn giờ nghỉ trưa.
    const lunchBreak = null;

    // 7. Gọi thuật toán tính toán slot trống
    const availableSlots = Array.from(new Set(
      shifts.flatMap((shift) => calculateAvailableSlots(
        { startTime: shift.startTime, endTime: shift.endTime },
        appointments,
        lunchBreak,
        service.durationMinutes,
        service.bufferMinutes,
        dateStr
      ))
    )).sort();

    // 8. Lưu kết quả vào cache Redis với TTL = 45 giây
    if (!isToday) {
      await redis.set(cacheKey, JSON.stringify(availableSlots), 'EX', 45);
    }

    return availableSlots;
  }

  /**
   * Tạo một lịch hẹn mới
   */
  async createAppointment(data: {
    patientId?: string;
    patientName?: string;
    patientPhone?: string;
    dentistId: string;
    serviceId: string;
    startTime: string;
    bookingChannel: 'Online' | 'Phone' | 'WalkIn' | 'Staff';
    patientNotes?: string;
  }) {
    const { patientId, patientName, patientPhone, dentistId: dentistIdInput, serviceId: serviceIdInput, startTime, bookingChannel, patientNotes } = data;

    const dentistIdVal = await resolveDentistId(dentistIdInput);
    const serviceIdVal = await resolveServiceId(serviceIdInput);
    const dentistId = dentistIdVal.toString();
    const serviceId = serviceIdVal.toString();

    let dbPatientId: bigint;

    if (patientId) {
      // 1. Kiểm tra thông tin bệnh nhân đăng nhập
      const cleanPatientId = patientId.toString().replace('P-', '');
      const patient = await prisma.patient.findUnique({
        where: { patientId: BigInt(cleanPatientId) },
      });

      if (!patient) {
        throw new AppError(404, 'Bệnh nhân không tồn tại.', 'PATIENT_NOT_FOUND');
      }

      if (patient.isLocked) {
        throw new AppError(
          400,
          `Tài khoản bệnh nhân đang bị khóa. Lý do: ${patient.lockedReason || 'Không xác định'}`,
          'PATIENT_LOCKED'
        );
      }
      dbPatientId = patient.patientId;
    } else {
      // Bệnh nhân vãng lai đặt lịch không cần đăng nhập
      if (!patientPhone || !patientName) {
        throw new AppError(400, 'Thiếu thông tin họ tên hoặc số điện thoại của bệnh nhân vãng lai.', 'GUEST_INFO_REQUIRED');
      }

      // Kiểm tra xem số điện thoại này đã có hồ sơ bệnh nhân trong DB chưa
      let patient = await prisma.patient.findUnique({
        where: { phone: patientPhone.trim() },
      });

      if (!patient) {
        // Tự động tạo hồ sơ bệnh nhân vãng lai mới
        const tier = await prisma.membershipTier.findFirst({
          where: { code: 'STANDARD' },
        });
        
        if (!tier) {
          throw new AppError(500, 'Không tìm thấy hạng thành viên mặc định (STANDARD). Vui lòng liên hệ quản trị viên.', 'TIER_NOT_FOUND');
        }

        patient = await prisma.patient.create({
          data: {
            fullName: patientName.trim(),
            phone: patientPhone.trim(),
            tierId: tier.tierId,
          },
        });
      } else {
        if (patient.isLocked) {
          throw new AppError(
            400,
            `Số điện thoại này đang bị khóa trên hệ thống. Lý do: ${patient.lockedReason || 'Không xác định'}`,
            'PATIENT_LOCKED'
          );
        }
      }
      dbPatientId = patient.patientId;
    }

    // 2. Kiểm tra giới hạn: Bệnh nhân không được có quá 3 lịch hẹn đang chờ khám
    const pendingCount = await prisma.appointment.count({
      where: {
        patientId: dbPatientId,
        status: {
          in: ['Confirmed', 'InProgress'],
        },
      },
    });

    if (pendingCount >= 3) {
      throw new AppError(
        400,
        'Bệnh nhân đã đạt giới hạn tối đa (3) lịch hẹn đang ở trạng thái chờ khám.',
        'PENDING_LIMIT_REACHED'
      );
    }

    const startDateTime = new Date(startTime);
    if (Number.isNaN(startDateTime.getTime())) {
      throw new AppError(400, 'Thời gian bắt đầu lịch hẹn không hợp lệ.', 'INVALID_APPOINTMENT_TIME');
    }

    const requestedDateStr = getVietnamDateStr(startDateTime);
    const availableSlots = await this.getAvailableSlots(dentistId, requestedDateStr, serviceId);
    const isRequestedSlotAvailable = availableSlots.some(
      (slot) => new Date(slot).getTime() === startDateTime.getTime()
    );

    if (!isRequestedSlotAvailable) {
      throw new AppError(
        409,
        'Khung giờ này vừa mới được một bệnh nhân khác đặt mất hoặc không còn khả dụng. Vui lòng chọn khung giờ khám khác.',
        'SLOT_NOT_AVAILABLE'
      );
    }

    // 3. Khóa Redis Lock để ngăn chặn ghi trùng thời gian thực
    const lockKey = `booking_lock:${dentistId}:${startTime}`;
    const lockToken = Math.random().toString(36).substring(2);
    
    // Đặt lock trong 10 giây (EX: hết hạn sau 10s, NX: chỉ ghi nếu chưa tồn tại)
    const lockAcquired = await redis.set(lockKey, lockToken, 'EX', 10, 'NX');
    if (!lockAcquired) {
      throw new AppError(
        409,
        'Khung giờ này đang được xử lý bởi một yêu cầu khác, vui lòng thử lại sau vài giây.',
        'BOOKING_CONFLICT'
      );
    }

    // Lấy thông tin dịch vụ để tính toán thời gian kết thúc (endTime)
    const service = await prisma.service.findUnique({
      where: { serviceId: BigInt(serviceId) },
    });

    if (!service) {
      throw new AppError(404, 'Dịch vụ không tồn tại.', 'SERVICE_NOT_FOUND');
    }

    const serviceTotalMinutes = service.durationMinutes + service.bufferMinutes;
    const endDateTime = new Date(startDateTime.getTime() + serviceTotalMinutes * 60 * 1000);

    // --- Kiểm tra xung đột theo số điện thoại / patientId ---
    // Nếu cùng bệnh nhân (hoặc cùng số điện thoại) đã có lịch hẹn khác
    // chồng giờ với bác sĩ khác, trả về cảnh báo để UI hiển thị.
    const conflictingAppt = await prisma.appointment.findFirst({
      where: {
        patientId: dbPatientId,
        dentistId: { not: dentistIdVal },
        status: { notIn: ['Cancelled', 'NoShow'] },
        AND: [
          { startTime: { lt: endDateTime } },
          { endTime: { gt: startDateTime } },
        ],
      },
      select: { appointmentId: true, dentistId: true, startTime: true, endTime: true },
    });

    if (conflictingAppt) {
      throw new AppError(
        409,
        'Số điện thoại này đã có lịch hẹn trùng thời gian với bác sĩ khác. Vui lòng kiểm tra lại.',
        'PHONE_CONFLICT'
      );
    }

    try {
      // 4. Thực hiện ghi dữ liệu vào CSDL
      const newAppointment = await prisma.appointment.create({
        data: {
          patientId: dbPatientId,
          dentistId: BigInt(dentistId),
          serviceId: BigInt(serviceId),
          startTime: startDateTime,
          endTime: endDateTime, // truyền endTime để đáp ứng điều kiện NOT NULL của Prisma client
          bookingChannel,
          patientNotes,
        },
        include: {
          patient: {
            select: { fullName: true, phone: true },
          },
          dentist: {
            select: { specialty: true },
          },
          service: {
            select: { name: true, price: true },
          },
        },
      });

      // 5. Sau khi đặt lịch thành công, xóa cache slots của bác sĩ trong ngày này
      const dateStr = startTime.split('T')[0];
      const cachePattern = `slots:${dentistId}:${dateStr}:*`;
      const keys = await redis.keys(cachePattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      return newAppointment;
    } catch (error: any) {
      // Bắt lỗi vi phạm ràng buộc EXCLUDE (DB ném lỗi trùng lịch)
      if (error.message && (error.message.includes('23P01') || error.message.toLowerCase().includes('exclude'))) {
        throw new AppError(
          409,
          'Lịch khám đã bị trùng với lịch hiện có của bác sĩ hoặc phòng khám này.',
          'APPOINTMENT_OVERLAP'
        );
      }
      throw error;
    } finally {
      // 6. Giải phóng khóa Redis Lock an toàn
      const currentToken = await redis.get(lockKey);
      if (currentToken === lockToken) {
        await redis.del(lockKey);
      }
    }
  }

  /**
   * Hủy lịch hẹn
   */
  async cancelAppointment(id: string, cancelReason: string) {
    // 1. Kiểm tra lịch hẹn tồn tại
    const appointment = await prisma.appointment.findUnique({
      where: { appointmentId: BigInt(id) },
    });

    if (!appointment) {
      throw new AppError(404, 'Không tìm thấy lịch hẹn cần hủy.', 'APPOINTMENT_NOT_FOUND');
    }

    if (appointment.status === 'Cancelled') {
      throw new AppError(400, 'Lịch hẹn này đã được hủy trước đó.', 'ALREADY_CANCELLED');
    }

    // 2. Tiến hành hủy lịch hẹn
    const updatedAppointment = await prisma.appointment.update({
      where: { appointmentId: BigInt(id) },
      data: {
        status: 'Cancelled',
        cancelledAt: new Date(),
        cancelReason,
      },
    });

    // 3. Nghiệp vụ: Đếm số lần hủy lịch của bệnh nhân trong 30 ngày gần đây
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const cancelCount = await prisma.appointment.count({
      where: {
        patientId: appointment.patientId,
        status: 'Cancelled',
        cancelledAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Nếu hủy lịch từ 3 lần trở lên trong 30 ngày, tự động khóa tài khoản
    if (cancelCount >= 3) {
      await prisma.patient.update({
        where: { patientId: appointment.patientId },
        data: {
          isLocked: true,
          lockedReason: `Tự động khóa do hủy lịch hẹn ${cancelCount} lần trong vòng 30 ngày.`,
        },
      });
    }

    // Xóa cache slots của bác sĩ trong ngày bị hủy
    const dateStr = appointment.startTime.toISOString().split('T')[0];
    const cachePattern = `slots:${appointment.dentistId}:${dateStr}:*`;
    const keys = await redis.keys(cachePattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }

    return updatedAppointment;
  }

  /**
   * Lấy toàn bộ danh sách lịch hẹn để đồng bộ hóa cho Lễ tân
   */
  async getAllAppointments() {
    // Tự động chuyển các lịch quá hạn 15 phút chưa check-in thành Cancelled (Tự động hủy)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const overdueAppointments = await prisma.appointment.findMany({
      where: {
        status: 'Confirmed',
        startTime: {
          lt: fifteenMinsAgo,
        },
      },
      select: {
        appointmentId: true,
        patientId: true,
      },
    });

    let countCancelled = 0;
    if (overdueAppointments.length > 0) {
      for (const appt of overdueAppointments) {
        const inQueue = await prisma.queueTicket.findFirst({
          where: {
            patientId: appt.patientId,
            status: { notIn: ['Completed', 'Cancelled'] },
          },
        });
        if (!inQueue) {
          await prisma.appointment.update({
            where: { appointmentId: appt.appointmentId },
            data: {
              status: 'Cancelled',
              cancelledAt: new Date(),
              cancelReason: 'Tự động hủy do trễ quá 15 phút chưa check-in',
            },
          });
          countCancelled++;
        }
      }
    }

    if (countCancelled > 0) {
      socketManager.emit('appointment:cancelled', { count: countCancelled, reason: 'auto_cancelled_15m_late' });
    }

    const list = await prisma.appointment.findMany({
      include: {
        patient: { include: { user: true } },
        dentist: { include: { user: true } },
        service: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatDate = (date: Date): string => {
      const today = new Date();
      const isToday = date.getFullYear() === today.getFullYear() &&
                      date.getMonth() === today.getMonth() &&
                      date.getDate() === today.getDate();
      
      const hh = pad(date.getHours());
      const mm = pad(date.getMinutes());
      
      if (isToday) {
        return `${hh}:${mm}`;
      } else {
        const dd = pad(date.getDate());
        const m = pad(date.getMonth() + 1);
        const yyyy = date.getFullYear();
        return `${dd}/${m}/${yyyy} @ ${hh}:${mm}`;
      }
    };

    return list.map((appt) => {
      let statusStr: 'Confirmed' | 'In-Progress' | 'Completed' | 'Cancelled' | 'NoShow' = 'Confirmed';
      if (appt.status === 'InProgress') {
        statusStr = 'In-Progress';
      } else if (appt.status === 'Completed') {
        statusStr = 'Completed';
      } else if (appt.status === 'Cancelled') {
        statusStr = 'Cancelled';
      } else if (appt.status === 'NoShow') {
        statusStr = 'NoShow';
      }


      return {
        id: `A-${appt.appointmentId}`,
        patientId: appt.patientId ? `P-${appt.patientId}` : '',
        patientName: appt.patient?.fullName || 'Bệnh nhân',
        patientPhone: appt.patient?.phone || 'Chưa cập nhật',
        serviceName: appt.service?.name || 'Dịch vụ',
        dentistId: `D-${appt.dentistId.toString().padStart(2, '0')}`,
        dentistName: appt.dentist?.user?.fullName || 'Bác sĩ',
        time: formatDate(appt.startTime),
        status: statusStr,
      };
    });
  }
}
export const appointmentsService = new AppointmentsService();
