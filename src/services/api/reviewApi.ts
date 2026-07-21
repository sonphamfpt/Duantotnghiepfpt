import { request } from './apiClient';
import { ServiceReviewItem } from '../../types/clinic';

export const reviewApi = {
  /**
   * Lấy danh sách đánh giá công khai (Trang chủ / Dịch vụ)
   */
  getPublicReviews: (serviceId?: string) => {
    const query = serviceId ? `?serviceId=${encodeURIComponent(serviceId)}` : '';
    return request<ServiceReviewItem[]>(`/reviews${query}`);
  },

  /**
   * Lấy danh sách đánh giá quản lý (Manager)
   */
  getManageReviews: (filters?: { sentiment?: string; rating?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.sentiment) params.append('sentiment', filters.sentiment);
    if (filters?.rating) params.append('rating', filters.rating.toString());
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<ServiceReviewItem[]>(`/reviews/manage${query}`);
  },

  /**
   * Đăng ký đánh giá mới
   */
  createReview: (data: {
    patientId: string;
    appointmentId?: string;
    serviceId?: string;
    rating: number;
    comment: string;
  }) => {
    return request<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Ẩn / Hiện đánh giá (Manager)
   */
  updateReviewStatus: (id: string, status: 'Approved' | 'Hidden') => {
    const rawId = id.split('-')[1] || id;
    return request<any>(`/reviews/${rawId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * Yêu cầu AI sinh lại phản hồi
   */
  reGenerateAIReply: (id: string) => {
    const rawId = id.split('-')[1] || id;
    return request<any>(`/reviews/${rawId}/ai-reply`, {
      method: 'POST',
    });
  },
};
