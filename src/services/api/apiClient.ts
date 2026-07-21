// Đọc URL gốc từ biến môi trường Vite (.env → VITE_API_BASE_URL)
// Fallback về localhost:5000 khi chạy local mà không có .env
export const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000') + '/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

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

  const resData = await response.json();

  if (!response.ok) {
    const errorCode = resData.error?.code || '';
    const errorMsg = resData.error?.message || resData.message || `Lỗi kết nối máy chủ (HTTP ${response.status})`;

    // 401: Token hết hạn hoặc tài khoản bị khoá → tự động đăng xuất và redirect
    if (response.status === 401 && !config?.skipAuthRedirect) {
      const isInactive = errorCode === 'USER_INACTIVE';
      localStorage.removeItem('goodsmile_token');
      localStorage.removeItem('goodsmile_user');
      if (!window.location.pathname.startsWith('/login')) {
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
