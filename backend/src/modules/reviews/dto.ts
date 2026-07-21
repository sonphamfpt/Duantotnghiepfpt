import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';

export const CreateReviewSchema = z.object({
  patientId: z.string().min(1, 'patientId là bắt buộc'),
  appointmentId: z.string().optional(),
  serviceId: z.string().optional(),
  rating: z.number().int().min(1, 'Đánh giá tối thiểu 1 sao').max(5, 'Đánh giá tối đa 5 sao'),
  comment: z.string().min(5, 'Nội dung đánh giá tối thiểu 5 ký tự'),
});

export const UpdateReviewStatusSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
});

export const UpdateAIReplySchema = z.object({
  aiReply: z.string().min(1, 'Nội dung phản hồi không được để trống'),
});

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;
