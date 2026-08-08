import { Request, Response, NextFunction } from 'express';
import { ReviewStatus, ReviewSentiment } from '@prisma/client';
import * as service from './service';
import { CreateReviewSchema, UpdateReviewStatusSchema } from './dto';
import { serializeBigInt } from '../../utils/serialize';

const parseId = (id: string | number | bigint): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

/**
 * Đăng ký đánh giá dịch vụ mới (Bệnh nhân)
 */
export async function createReviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = CreateReviewSchema.parse(req.body);
    const patientId = parseId(body.patientId);
    const appointmentId = body.appointmentId ? parseId(body.appointmentId) : undefined;
    const serviceId = body.serviceId ? parseId(body.serviceId) : undefined;

    const data = await service.createReview({
      patientId,
      appointmentId,
      serviceId,
      rating: body.rating,
      comment: body.comment,
    });

    return res.status(201).json({
      success: true,
      message: 'Gửi đánh giá thành công! Cảm ơn ý kiến đóng góp của bạn.',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy danh sách đánh giá công khai (Cho trang chủ / chi tiết dịch vụ)
 */
export async function getPublicReviewsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const serviceIdStr = req.query.serviceId as string;
    const serviceId = serviceIdStr ? parseId(serviceIdStr) : undefined;

    const data = await service.getPublicReviews(serviceId);

    const formatted = data.map(r => ({
      id: `REV-${r.reviewId}`,
      patientName: r.patient.user?.fullName || 'Bệnh nhân',
      serviceName: r.service?.name || 'Dịch vụ nha khoa',
      dentistName: r.appointment?.dentist?.user?.fullName || 'Bác sĩ GoodSmile',
      rating: r.rating,
      comment: r.comment,
      sentiment: r.sentiment,
      aiReply: r.aiReply,
      createdAt: r.createdAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy danh sách đánh giá cho Quản lý (RBAC: Manager)
 */
export async function getManageReviewsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const sentiment = req.query.sentiment as ReviewSentiment | undefined;
    const rating = req.query.rating ? Number(req.query.rating) : undefined;
    const status = req.query.status as ReviewStatus | undefined;

    const data = await service.getManageReviews({ sentiment, rating, status });

    const formatted = data.map(r => ({
      id: `REV-${r.reviewId}`,
      patientId: `P-${r.patientId}`,
      patientName: r.patient.user?.fullName || 'Bệnh nhân',
      patientPhone: r.patient.user?.phone || '',
      serviceName: r.service?.name || 'Dịch vụ nha khoa',
      dentistName: r.appointment?.dentist?.user?.fullName || 'Bác sĩ GoodSmile',
      rating: r.rating,
      comment: r.comment,
      sentiment: r.sentiment,
      aiReply: r.aiReply,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Ẩn / Hiện bài đánh giá (RBAC: Manager)
 */
export async function updateReviewStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reviewId = parseId(req.params.id);
    const { status } = UpdateReviewStatusSchema.parse(req.body);

    const data = await service.updateReviewStatus(reviewId, status);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái bài đánh giá thành công.',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Yêu cầu AI sinh lại phản hồi mới (RBAC: Manager)
 */
export async function reGenerateAIReplyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reviewId = parseId(req.params.id);
    const data = await service.reGenerateAIReply(reviewId);

    return res.status(200).json({
      success: true,
      message: 'AI đã tạo lại phản hồi mới thành công.',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}
