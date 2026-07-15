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
    request<{ user: AuthUser }>('/auth/me', {
      method: 'GET',
    }),
};
