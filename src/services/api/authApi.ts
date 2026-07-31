import { request } from './apiClient';

export interface AuthUser {
  userId: string;
  fullName: string;
  phone: string;
  email?: string;
  role: any; // Có thể là chuỗi hoặc đối tượng chứa { code }
  dentistId?: string;
  patientId?: string;
  avatarUrl?: string;
  patientProfile?: {
    dateOfBirth?: string | null;
    gender?: string | null;
    address?: string | null;
    criticalAllergy?: string | null;
    medicalCondition?: string | null;
  };
  dentistProfile?: {
    specialty?: string | null;
    degree?: string | null;
    experienceYears?: number | null;
    bio?: string | null;
    motto?: string | null;
  };
}


export interface LoginResult {
  token: string;
  user: AuthUser;
}

export const authApi = {
  /**
   * Đăng nhập tài khoản bằng số điện thoại và mật khẩu
   */
  login: (identifier: string, password: string) =>
    request<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),


  /**
   * Đăng ký tài khoản cho bệnh nhân mới
   */
  register: (fullName: string, phone: string, password: string, otpToken: string, dateOfBirth?: string, gender?: string, address?: string) =>
    request<{ token: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, phone, password, otpToken, dateOfBirth, gender, address }),
    }),

  /**
   * Lấy thông tin user hiện tại từ token (khôi phục session)
   */
  getMe: () =>
    request<AuthUser>('/auth/me', {
      method: 'GET',
    }, { skipAuthRedirect: true }),

  /**
   * Gửi OTP yêu cầu Quên mật khẩu
   */
  sendForgotPasswordOtp: (phone: string) =>
    request<{ phone: string }>('/auth/forgot-password/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  /**
   * Đặt lại mật khẩu mới bằng OTP token
   */
  resetPassword: (phone: string, otpToken: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ phone, otpToken, newPassword }),
    }),

  /**
   * Upload ảnh đại diện (multipart/form-data)
   */
  uploadAvatar: async (file: File): Promise<{ success: boolean; data?: { avatarUrl: string }; message?: string }> => {
    const token = localStorage.getItem('goodsmile_token');
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${(await import('./apiClient')).BASE_URL}/auth/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || json.message || 'Upload thất bại');
    return { success: true, data: json.data, message: json.message };
  },

  /**
   * Đổi mật khẩu
   */
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  /**
   * Cập nhật thông tin cá nhân theo Role
   */
  updateProfile: (data: Record<string, any>) =>
    request<{ message: string }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
