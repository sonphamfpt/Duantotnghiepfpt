const BASE_URL = 'http://localhost:5000/api';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/**
 * Hàm gọi API dùng chung, tự động quản lý JWT token và parse JSON.
 */
export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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
    throw new Error(resData.message || `Lỗi kết nối máy chủ (HTTP ${response.status})`);
  }

  // Chuẩn hóa phản hồi từ API để luôn có trường success và data
  return {
    success: true,
    message: resData.message,
    data: resData.data !== undefined ? resData.data : resData,
  } as ApiResponse<T>;

}
