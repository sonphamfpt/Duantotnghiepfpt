// Đọc URL gốc từ biến môi trường Vite (.env → VITE_API_BASE_URL)
// Fallback về localhost:5000 khi chạy local mà không có .env
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000') + '/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const ERROR_CODE_MAP: Record<string, string> = {
  'PATIENT_ALREADY_IN_QUEUE': 'Bệnh nhân này đã có trong hàng chờ khám hôm nay.',
  'APPOINTMENT_NOT_FOUND': 'Không tìm thấy thông tin lịch hẹn.',
  'APPOINTMENT_CANCELLED': 'Lịch hẹn này đã bị hủy, không thể tiếp đón.',
  'DENTIST_NOT_FOUND': 'Không tìm thấy thông tin bác sĩ.',
  'SHIFT_NOT_FOUND': 'Không tìm thấy ca trực của bác sĩ.',
  'PAST_SHIFT_INVALID': 'Không thể tạo ca trực trong quá khứ.',
  'DUPLICATE_SHIFT': 'Bác sĩ đã có ca trực vào khung giờ này.',
};

/**
 * Hàm gọi API dùng chung, tự động quản lý JWT token và parse JSON.
 */
export async function request<T>(endpoint: string, options: RequestInit = {}, config?: { skipAuthRedirect?: boolean }): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('goodsmile_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let resData: any = {};
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      resData = await response.json();
    } catch {
      resData = {};
    }
  } else {
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    const errorCode = resData.error?.code || '';
    let errorMsg = resData.error?.message || resData.message || '';

    // Nếu message là mã code in hoa (ví dụ: 'PATIENT_ALREADY_IN_QUEUE'), dịch sang câu Tiếng Việt thân thiện
    if (ERROR_CODE_MAP[errorMsg]) {
      errorMsg = ERROR_CODE_MAP[errorMsg];
    } else if (ERROR_CODE_MAP[errorCode] && (!errorMsg || /^[A-Z0-9_]+$/.test(errorMsg))) {
      errorMsg = ERROR_CODE_MAP[errorCode];
    } else if (errorCode && errorCode.includes(' ') && (!errorMsg || /^[A-Z0-9_]+$/.test(errorMsg))) {
      errorMsg = errorCode;
    }

    if (!errorMsg || /^[A-Z0-9_]+$/.test(errorMsg)) {
      errorMsg = `Thao tác thất bại (Mã lỗi: ${errorMsg || errorCode || response.status})`;
    }

    // 401: Token hết hạn hoặc tài khoản bị khoá → tự động đăng xuất và redirect (chỉ khi đang ở trang riêng tư và có token)
    if (response.status === 401 && !config?.skipAuthRedirect) {
      const isInactive = errorCode === 'USER_INACTIVE';
      const hadToken = !!token;
      localStorage.removeItem('goodsmile_token');
      localStorage.removeItem('goodsmile_user');

      const currentPath = window.location.pathname;
      const publicPaths = ['/login', '/', '/book', '/services', '/dentists', '/about'];
      const isPublicPath = publicPaths.some(p => currentPath === p || (p !== '/' && currentPath.startsWith(p)));

      if (!isPublicPath && hadToken) {
        const msg = isInactive
          ? 'Tài khoản của bạn đã bị ngưng hoạt động. Bạn sẽ được đăng xuất ngay.'
          : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        alert(msg);
        window.location.href = '/login';
      }
    }

    throw new Error(errorMsg);
  }

  // Chuẩn hóa phản hồi từ API để luôn có trường success và data
  return {
    success: true,
    message: resData.message,
    data: resData.data !== undefined ? resData.data : resData,
  } as ApiResponse<T>;

}
