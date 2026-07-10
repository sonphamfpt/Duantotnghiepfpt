import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { PlanStatus } from '@prisma/client';

/**
 * Lấy danh sách phác đồ điều trị (có thể lọc theo bệnh nhân)
 */
export async function getTreatmentPlans(patientId?: bigint) {
  return await prisma.treatmentPlan.findMany({
    where: patientId ? { patientId } : undefined,
    include: {
      patient: { include: { tier: true } },
      dentist: { include: { user: true } },
      medicalRecords: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Lấy chi tiết một phác đồ kèm danh sách lịch sử bệnh án liên quan
 */
export async function getTreatmentPlanById(planId: bigint) {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { planId },
    include: {
      patient: { include: { tier: true } },
      dentist: { include: { user: true } },
      medicalRecords: {
        include: {
          dentist: { include: { user: true } },
          room: true,
          teeth: true,
          services: { include: { service: true } },
          prescription: { include: { items: true } },
          files: true,
        },
        orderBy: {
          visitDate: 'desc',
        },
      },
    },
  });

  if (!plan) {
    throw new AppError(404, 'TREATMENT_PLAN_NOT_FOUND', 'Phác đồ điều trị không tồn tại.');
  }

  return plan;
}

/**
 * Tạo mới phác đồ điều trị thủ công
 */
export async function createTreatmentPlan(data: {
  patientId: bigint;
  dentistId: bigint;
  title: string;
  estimatedTotalCost?: number;
}) {
  return await prisma.treatmentPlan.create({
    data: {
      patientId: data.patientId,
      dentistId: data.dentistId,
      title: data.title,
      estimatedTotalCost: data.estimatedTotalCost || 0,
      status: PlanStatus.Active,
    },
  });
}

/**
 * Cập nhật trạng thái của phác đồ điều trị
 */
export async function updatePlanStatus(planId: bigint, status: PlanStatus) {
  const plan = await prisma.treatmentPlan.findUnique({
    where: { planId },
  });

  if (!plan) {
    throw new AppError(404, 'TREATMENT_PLAN_NOT_FOUND', 'Phác đồ điều trị không tồn tại.');
  }

  return await prisma.treatmentPlan.update({
    where: { planId },
    data: { status },
  });
}
