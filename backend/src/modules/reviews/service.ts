import { ReviewStatus, ReviewSentiment } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { generateAIReply, moderateContent } from '../../services/aiReplyService';

interface CreateReviewParams {
  patientId: bigint;
  appointmentId?: bigint;
  serviceId?: bigint;
  rating: number;
  comment: string;
}

/**
 * Tạo mới bài đánh giá dịch vụ & Tự động chạy AI Moderation + Sentiment + Auto-Reply
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

  // 2. Nếu có appointmentId -> Kiểm tra xem đã đánh giá chưa, nếu có thì CẬP NHẬT bài cũ
  let existingReviewId: bigint | null = null;
  if (appointmentId) {
    const existing = await prisma.serviceReview.findUnique({
      where: { appointmentId },
    });
    if (existing) {
      existingReviewId = existing.reviewId;
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

  // 4. AI Kiểm duyệt nội dung (chạy TRƯỚC khi lưu)
  const moderation = moderateContent(comment, rating);
  const autoStatus = moderation.isAppropriate
    ? ReviewStatus.Approved   // Nội dung sạch → duyệt ngay
    : ReviewStatus.Hidden;    // Nội dung bất lịch sự / spam → ẩn, chờ manager

  // 5. AI Phân tích cảm xúc & tạo phản hồi tự động
  const patientName = patient.user?.fullName || 'Bệnh nhân';
  const { sentiment, aiReply } = generateAIReply({
    patientName,
    serviceName,
    rating,
    comment,
  });

  // 6. Lưu vào CSDL (Tạo mới hoặc Cập nhật nếu đã từng đánh giá)
  const finalAiReply = moderation.isAppropriate
    ? aiReply
    : `[🛡️ AI MODERATION — ${moderation.confidence}] Bình luận bị ẩn tự động. Lý do: ${moderation.reason}`;

  const reviewPayload = {
    patientId,
    appointmentId,
    serviceId: finalServiceId,
    rating,
    comment,
    sentiment,
    aiReply: finalAiReply,
    aiRepliedAt: new Date(),
    status: autoStatus,
  };

  const includePayload = {
    patient: { include: { user: true } },
    service: true,
    appointment: { include: { dentist: { include: { user: true } } } },
  };

  if (existingReviewId) {
    return await prisma.serviceReview.update({
      where: { reviewId: existingReviewId },
      data: reviewPayload,
      include: includePayload,
    });
  }

  return await prisma.serviceReview.create({
    data: reviewPayload,
    include: includePayload,
  });
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

  const patientName = existing.patient.user?.fullName || 'Bệnh nhân';
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
