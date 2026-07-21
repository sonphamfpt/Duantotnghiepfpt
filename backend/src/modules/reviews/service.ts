import { ReviewStatus, ReviewSentiment } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { generateAIReply } from '../../services/aiReplyService';

interface CreateReviewParams {
  patientId: bigint;
  appointmentId?: bigint;
  serviceId?: bigint;
  rating: number;
  comment: string;
}

/**
 * Tạo mới bài đánh giá dịch vụ & Tự động chạy AI Sentiment Analysis + Auto-Reply
 */
export async function createReview(params: CreateReviewParams) {
  const { patientId, appointmentId, serviceId, rating, comment } = params;

  // 1. Kiểm tra bệnh nhân tồn tại
  const patient = await prisma.patient.findUnique({
    where: { patientId },
    include: { user: true },
  });
  if (!patient) {
    throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân.', 'PATIENT_NOT_FOUND');
  }

  // 2. Nếu có appointmentId -> Kiểm tra xem đã đánh giá chưa
  if (appointmentId) {
    const existing = await prisma.serviceReview.findUnique({
      where: { appointmentId },
    });
    if (existing) {
      throw new AppError(409, 'Lịch hẹn này đã được đánh giá.', 'REVIEW_ALREADY_EXISTS');
    }
  }

  // 3. Lấy tên dịch vụ (nếu có)
  let serviceName: string | undefined = undefined;
  let finalServiceId = serviceId;

  if (appointmentId) {
    const appt = await prisma.appointment.findUnique({
      where: { appointmentId },
      include: { service: true },
    });
    if (appt) {
      serviceName = appt.service.name;
      finalServiceId = appt.serviceId;
    }
  } else if (serviceId) {
    const srv = await prisma.service.findUnique({ where: { serviceId } });
    if (srv) serviceName = srv.name;
  }

  // 4. Gọi AI Service phân tích cảm xúc & tạo phản hồi tự động
  const patientName = patient.user?.fullName || patient.fullName;
  const { sentiment, aiReply } = generateAIReply({
    patientName,
    serviceName,
    rating,
    comment,
  });

  // 5. Lưu vào CSDL
  const review = await prisma.serviceReview.create({
    data: {
      patientId,
      appointmentId,
      serviceId: finalServiceId,
      rating,
      comment,
      sentiment,
      aiReply,
      aiRepliedAt: new Date(),
      status: ReviewStatus.Approved,
    },
    include: {
      patient: { include: { user: true } },
      service: true,
      appointment: { include: { dentist: { include: { user: true } } } },
    },
  });

  return review;
}

/**
 * Lấy danh sách đánh giá công khai đã được duyệt (Cho Trang chủ / Dịch vụ)
 */
export async function getPublicReviews(serviceId?: bigint) {
  return await prisma.serviceReview.findMany({
    where: {
      status: ReviewStatus.Approved,
      ...(serviceId ? { serviceId } : {}),
    },
    include: {
      patient: { include: { user: true } },
      service: true,
      appointment: { include: { dentist: { include: { user: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

/**
 * Lấy danh sách đánh giá cho Quản lý (đủ bộ lọc sentiment, rating, status)
 */
export async function getManageReviews(query: {
  sentiment?: ReviewSentiment;
  rating?: number;
  status?: ReviewStatus;
}) {
  return await prisma.serviceReview.findMany({
    where: {
      ...(query.sentiment ? { sentiment: query.sentiment } : {}),
      ...(query.rating ? { rating: query.rating } : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: {
      patient: { include: { user: true } },
      service: true,
      appointment: { include: { dentist: { include: { user: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Đổi trạng thái ẩn/hiện bài đánh giá (Manager)
 */
export async function updateReviewStatus(reviewId: bigint, status: ReviewStatus) {
  const existing = await prisma.serviceReview.findUnique({ where: { reviewId } });
  if (!existing) {
    throw new AppError(404, 'Không tìm thấy bài đánh giá.', 'NOT_FOUND');
  }

  return await prisma.serviceReview.update({
    where: { reviewId },
    data: { status },
  });
}

/**
 * Tạo lại phản hồi AI (Manager yêu cầu re-generate)
 */
export async function reGenerateAIReply(reviewId: bigint) {
  const existing = await prisma.serviceReview.findUnique({
    where: { reviewId },
    include: {
      patient: { include: { user: true } },
      service: true,
    },
  });
  if (!existing) {
    throw new AppError(404, 'Không tìm thấy bài đánh giá.', 'NOT_FOUND');
  }

  const patientName = existing.patient.user?.fullName || existing.patient.fullName;
  const serviceName = existing.service?.name;

  const { sentiment, aiReply } = generateAIReply({
    patientName,
    serviceName,
    rating: existing.rating,
    comment: existing.comment,
  });

  return await prisma.serviceReview.update({
    where: { reviewId },
    data: {
      sentiment,
      aiReply,
      aiRepliedAt: new Date(),
    },
  });
}
