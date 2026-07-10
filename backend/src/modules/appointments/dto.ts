import { z } from 'zod';

// Schema xác thực Query parameters khi lấy slot trống
export const getAvailableSlotsSchema = z.object({
  query: z.object({
    date: z.string({
      required_error: "Ngày khám (date) là bắt buộc",
    }).regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày khám phải có định dạng YYYY-MM-DD"),
    serviceId: z.string({
      required_error: "ID dịch vụ (serviceId) là bắt buộc",
    }),
  }),
});

// Schema xác thực Body khi đặt lịch hẹn mới
export const createAppointmentSchema = z.object({
  body: z.object({
    patientId: z.string().optional(),
    patientName: z.string().min(2, "Họ tên tối thiểu 2 ký tự").optional(),
    patientPhone: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})\b$/, "Số điện thoại không hợp lệ").optional(),
    dentistId: z.string({
      required_error: "ID bác sĩ (dentistId) là bắt buộc",
    }),
    serviceId: z.string({
      required_error: "ID dịch vụ (serviceId) là bắt buộc",
    }),
    startTime: z.string({
      required_error: "Thời gian bắt đầu (startTime) là bắt buộc",
    }).datetime({
      message: "Thời gian bắt đầu phải ở định dạng ISO 8601 UTC (ví dụ: 2026-07-02T08:30:00.000Z)",
    }),
    bookingChannel: z.enum(['Online', 'Phone', 'WalkIn', 'Staff']).default('Online'),
    patientNotes: z.string().max(500, "Ghi chú tối đa 500 ký tự").optional(),
  }).refine(data => data.patientId || (data.patientName && data.patientPhone), {
    message: "Phải cung cấp ID bệnh nhân hoặc cả Họ tên và Số điện thoại cho khách vãng lai",
    path: ["patientId"],
  }),
});

// Schema xác thực tham số khi hủy lịch hẹn
export const cancelAppointmentSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "ID lịch hẹn phải là một số nguyên dương"),
  }),
  body: z.object({
    cancelReason: z.string({
      required_error: "Lý do hủy lịch (cancelReason) là bắt buộc",
    }).min(5, "Lý do hủy lịch phải có ít nhất 5 ký tự").max(200, "Lý do hủy tối đa 200 ký tự"),
  }),
});

export type GetAvailableSlotsInput = z.infer<typeof getAvailableSlotsSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;
