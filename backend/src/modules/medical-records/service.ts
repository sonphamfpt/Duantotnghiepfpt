import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { SessionType } from '@prisma/client';
import { createInvoice } from '../invoices/service';
import { socketManager } from '../../config/socket';


export interface FormattedMedicalRecord {
  id: string;
  patientId: string;
  dentistId: string;
  dentistName: string;
  room: string;
  date: string;
  title: string;
  notes: string;
  teethMap?: Array<{
    toothNumber: number;
    condition: string;
    treatment?: string;
  }>;
  prescription?: {
    id: string;
    medicines: Array<{
      name: string;
      dose: string;
      duration: string;
      note: string;
    }>;
    instructions?: string;
  };
  files?: Array<{
    id: string;
    type: 'pdf' | 'image' | 'prescription';
    title: string;
    size: string;
    url?: string;
  }>;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export function formatMedicalRecord(rec: any): FormattedMedicalRecord {
  const d = new Date(rec.visitDate);
  const dateStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  const recordTitle = rec.services && rec.services.length > 0
    ? `Điều trị: ${rec.services[0].service.name}`
    : 'Khám lâm sàng';

  const teethMap = rec.teeth && rec.teeth.length > 0
    ? rec.teeth.map((t: any) => {
        let conditionStr = t.condition;
        if (t.treatmentNote && (t.treatmentNote.includes('[Implant]') || t.treatmentNote.toLowerCase().includes('implant'))) {
          conditionStr = 'implant';
        }
        return {
          toothNumber: t.toothNumber,
          condition: conditionStr,
          treatment: t.treatmentNote || undefined,
        };
      })
    : undefined;

  let prescription: any = undefined;
  if (rec.notes && rec.notes.includes('| Đơn thuốc:')) {
    const rxIndex = rec.notes.indexOf('| Đơn thuốc:');
    const rxPart = rec.notes.substring(rxIndex + 12).trim();
    if (rxPart) {
      const drugs = rxPart.split(';');
      const medicines = drugs.map((drug: string) => {
        const trimmedDrug = drug.trim();
        if (!trimmedDrug) return null;
        const match = trimmedDrug.match(/(.*?)\s*\(\s*(\d+)\s*([^)]*)\)\s*-\s*(.*)/);
        if (match) {
          return {
            name: match[1].trim(),
            dose: match[4].trim(),
            duration: `${match[2]} ${match[3].trim()}`,
            note: '',
          };
        }
        return {
          name: trimmedDrug,
          dose: 'Theo chỉ dẫn của bác sĩ',
          duration: '1 ngày',
          note: '',
        };
      }).filter(Boolean);

      if (medicines.length > 0) {
        prescription = {
          id: `RX-${rec.recordId}`,
          instructions: 'Uống thuốc đúng giờ và theo chỉ dẫn của bác sĩ.',
          medicines,
        };
      }
    }
  }

  const files = rec.files && rec.files.length > 0
    ? rec.files.map((f: any) => ({
        id: `FILE-${f.fileId}`,
        type: f.fileType.toLowerCase(),
        title: f.title,
        size: f.fileSizeKb ? `${(f.fileSizeKb / 1024).toFixed(1)} MB` : '1.0 MB',
        url: f.url || undefined,
      }))
    : undefined;

  return {
    id: `MR-${rec.recordId}`,
    patientId: `P-${rec.patientId}`,
    dentistId: `D-${rec.dentistId.toString().padStart(2, '0')}`,
    dentistName: rec.dentist?.user?.fullName || 'Bác sĩ',
    room: rec.room?.name || 'Phòng khám',
    date: dateStr,
    title: recordTitle,
    notes: rec.notes || '',
    teethMap,
    prescription,
    files,
  };
}

export async function getPatientRecords(patientId: bigint): Promise<FormattedMedicalRecord[]> {
  const records = await prisma.medicalRecord.findMany({
    where: { patientId },
    include: {
      dentist: { include: { user: true } },
      room: true,
      teeth: true,
      services: { include: { service: true } },
      files: true,
    },
    orderBy: {
      visitDate: 'desc',
    },
  });

  return records.map(formatMedicalRecord);
}

export async function getAllRecords(): Promise<FormattedMedicalRecord[]> {
  const records = await prisma.medicalRecord.findMany({
    include: {
      dentist: { include: { user: true } },
      room: true,
      teeth: true,
      services: { include: { service: true } },
      files: true,
    },
    orderBy: {
      visitDate: 'desc',
    },
  });

  return records.map(formatMedicalRecord);
}



export async function createRecord(data: {
  patientId: bigint;
  dentistId: bigint;
  queueTicketId?: bigint;
  notes: string;
  performedServices: bigint[];
  sessionType: 'independent' | 'plan_init' | 'plan_session';
  treatmentPlanId?: bigint;
  teeth: Array<{
    toothNumber: number;
    condition: 'healthy' | 'decay' | 'missing' | 'crown' | 'bridge' | 'treated' | 'implant' | string;
    treatmentNote?: string;
  }>;
}): Promise<FormattedMedicalRecord> {
  // 1. Tìm bác sĩ để lấy phòng khám mặc định
  const dentist = await prisma.dentist.findUnique({
    where: { dentistId: data.dentistId },
  });
  
  if (!dentist) {
    throw new AppError(440, 'DENTIST_NOT_FOUND', 'Bác sĩ không tồn tại.');
  }

  // 2. Chạy Transaction để chèn hồ sơ bệnh án
  const record = await prisma.$transaction(async (tx) => {
    const mapSessionType: Record<'independent' | 'plan_init' | 'plan_session', SessionType> = {
      independent: 'independent',
      plan_init: 'planInit',
      plan_session: 'planSession',
    };

    let planIdToUse: bigint | null = data.treatmentPlanId || null;

    // Tự động tạo Phác đồ điều trị khi khởi tạo phiên khám với plan_init
    if (data.sessionType === 'plan_init') {
      const firstService = await tx.service.findFirst({
        where: { serviceId: { in: data.performedServices } }
      });
      const planTitle = firstService 
        ? `Phác đồ điều trị ${firstService.name}` 
        : 'Phác đồ điều trị chuyên sâu';

      const services = await tx.service.findMany({
        where: { serviceId: { in: data.performedServices } }
      });
      const estimatedTotalCost = services.reduce((sum, s) => sum + Number(s.price), 0);

      const newPlan = await tx.treatmentPlan.create({
        data: {
          patientId: data.patientId,
          dentistId: data.dentistId,
          title: planTitle,
          estimatedTotalCost,
          status: 'Active',
        }
      });
      planIdToUse = newPlan.planId;
    }

    // 2.1 Tạo bản ghi MedicalRecord
    const newRecord = await tx.medicalRecord.create({
      data: {
        patientId: data.patientId,
        dentistId: data.dentistId,
        roomId: dentist.defaultRoomId,
        queueTicketId: data.queueTicketId || null,
        treatmentPlanId: planIdToUse,
        sessionType: mapSessionType[data.sessionType],
        notes: data.notes,
      },
    });

    // 2.2 Tạo các bản ghi răng điều trị (Mapping an toàn cho DB enum)
    const validDbConditions = ['healthy', 'decay', 'missing', 'crown', 'bridge', 'treated'];
    if (data.teeth.length > 0) {
      await tx.medicalRecordTooth.createMany({
        data: data.teeth.map((t) => {
          const isImplant = t.condition === 'implant';
          const safeCondition = validDbConditions.includes(t.condition) ? t.condition : 'crown';
          const note = isImplant ? `[Implant] ${t.treatmentNote || 'Cấy ghép Implant'}` : (t.treatmentNote || null);
          return {
            recordId: newRecord.recordId,
            toothNumber: t.toothNumber,
            condition: safeCondition as any,
            treatmentNote: note,
          };
        }),
      });
    }

    // 2.3 Tạo liên kết dịch vụ thực hiện
    if (data.performedServices.length > 0) {
      await tx.medicalRecordService.createMany({
        data: data.performedServices.map((svcId) => ({
          recordId: newRecord.recordId,
          serviceId: svcId,
        })),
      });
    }





    // 2.4 Cập nhật trạng thái QueueTicket & Appointment liên quan sang Completed
    let targetTicketId = data.queueTicketId;
    if (!targetTicketId) {
      const activeTicket = await tx.queueTicket.findFirst({
        where: {
          patientId: data.patientId,
          status: { in: ['Waiting', 'InChair'] },
        },
        orderBy: { ticketId: 'desc' },
      });
      if (activeTicket) {
        targetTicketId = activeTicket.ticketId;
      }
    }

    if (targetTicketId) {
      const updatedTicket = await tx.queueTicket.update({
        where: { ticketId: targetTicketId },
        data: {
          status: 'Completed',
          endTreatmentTime: new Date(),
        },
      });

      if (updatedTicket.appointmentId) {
        await tx.appointment.update({
          where: { appointmentId: updatedTicket.appointmentId },
          data: { status: 'Completed' },
        });
      }
    }

    // 2.5 Tính số lượt khám của bệnh nhân để tự động xếp hạng thành viên
    const visitCount = await tx.medicalRecord.count({
      where: { patientId: data.patientId },
    });

    const eligibleTier = await tx.membershipTier.findFirst({
      where: {
        minPoints: { lte: visitCount },
      },
      orderBy: {
        minPoints: 'desc',
      },
    });

    if (eligibleTier) {
      await tx.patient.update({
        where: { patientId: data.patientId },
        data: {
          tierId: eligibleTier.tierId,
          loyaltyPoints: visitCount, // Dùng loyaltyPoints làm số lượt khám hiển thị ở frontend
        },
      });
    }

    return newRecord;
  });

  // 2.5 Tự động tạo hóa đơn nháp (nếu không phải plan_session và có thực hiện dịch vụ)
  if (data.sessionType !== 'plan_session' && data.performedServices.length > 0) {
    try {
      await createInvoice({
        patientId: data.patientId,
        medicalRecordId: record.recordId,
        dentistId: data.dentistId,
        roomId: dentist.defaultRoomId,
        serviceIds: data.performedServices,
      });
      // Phát sự kiện WebSocket để quầy Thu ngân (Cashier) nhận được hóa đơn ngay lập tức
      // (không cần đợi polling 30 giây)
      socketManager.emit('invoice:created', { patientId: data.patientId.toString() });
    } catch (invoiceErr) {
      console.error('Lỗi khi tự động khởi tạo hóa đơn:', invoiceErr);
    }
  }

  // 3. Phát thông báo WebSocket để đồng bộ bàn khám bác sĩ & quầy lễ tân ngay lập tức
  socketManager.emit('queue:status_changed', { patientId: data.patientId.toString(), status: 'Completed' });

  // 4. Truy vấn lại bản ghi hoàn chỉnh để format trả về
  const fullRecord = await prisma.medicalRecord.findUnique({
    where: { recordId: record.recordId },
    include: {
      dentist: { include: { user: true } },
      room: true,
      teeth: true,
      services: { include: { service: true } },
      files: true,

    },
  });

  try {
    const patientObj = await prisma.patient.findUnique({
      where: { patientId: data.patientId },
      include: { user: true },
    });
    await prisma.systemLog.create({
      data: {
        module: 'DENTIST',
        logType: 'SUCCESS',
        message: `Bác sĩ ${fullRecord?.dentist?.user?.fullName || 'N/A'} hoàn tất bệnh án điều trị cho bệnh nhân ${patientObj?.user?.fullName || 'N/A'}.`,
      },
    });
  } catch (logErr) {
    console.error('Lỗi ghi log bệnh án:', logErr);
  }

  return formatMedicalRecord(fullRecord);
}
