import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string({
      required_error: "Email hoặc số điện thoại (identifier) là bắt buộc",
    }).min(3, "Tên đăng nhập phải có tối thiểu 3 ký tự"),
    password: z.string({
      required_error: "Mật khẩu (password) là bắt buộc",
    }).min(6, "Mật khẩu phải có tối thiểu 6 ký tự"),
  }),
});

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string({
      required_error: "Họ và tên (fullName) là bắt buộc",
    }).min(2, "Họ và tên phải có tối thiểu 2 ký tự").max(100, "Họ và tên tối đa 100 ký tự"),
    phone: z.string({
      required_error: "Số điện thoại (phone) là bắt buộc",
    }).regex(/^[0-9]{10,11}$/, "Số điện thoại phải là chữ số và có độ dài từ 10-11 ký tự"),
    email: z.string().email("Định dạng email không hợp lệ").optional().or(z.literal('')),
    password: z.string({
      required_error: "Mật khẩu (password) là bắt buộc",
    }).min(6, "Mật khẩu phải có tối thiểu 6 ký tự"),
    otpToken: z.string({
      required_error: "Mã xác thực OTP là bắt buộc",
    }).min(10, "Mã xác thực OTP không hợp lệ"),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh phải ở định dạng YYYY-MM-DD").optional().or(z.literal('')),
    gender: z.string().max(10).optional().or(z.literal('')),
  }),
});

export const forgotPasswordOtpSchema = z.object({
  body: z.object({
    phone: z.string({
      required_error: "Số điện thoại là bắt buộc",
    }).regex(/^[0-9]{10,11}$/, "Số điện thoại phải có 10-11 chữ số"),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    phone: z.string({
      required_error: "Số điện thoại là bắt buộc",
    }),
    otpToken: z.string({
      required_error: "Token OTP là bắt buộc",
    }),
    newPassword: z.string({
      required_error: "Mật khẩu mới là bắt buộc",
    }).min(6, "Mật khẩu mới phải có tối thiểu 6 ký tự"),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
