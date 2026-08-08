import { request } from './apiClient';

export interface Medicine {
  id: string;
  name: string;
  defaultDose: string;
  defaultDuration: string;
  defaultNote: string;
  isActive?: boolean;
  createdBy?: string | null;
  createdAt?: string;
}

/** Lấy danh sách thuốc đang active (dùng khi kê đơn) */
export async function fetchActiveMedicines(): Promise<Medicine[]> {
  const res = await request<Medicine[]>('/medicines');
  return (res.data || []) as Medicine[];
}

/** Lấy toàn bộ thuốc kể cả đã ẩn (dùng cho trang quản lý) */
export async function fetchAllMedicines(): Promise<Medicine[]> {
  const res = await request<Medicine[]>('/medicines/all');
  return (res.data || []) as Medicine[];
}

/** Thêm thuốc mới */
export async function addMedicine(data: {
  name: string;
  defaultDose?: string;
  defaultDuration?: string;
  defaultNote?: string;
}): Promise<Medicine> {
  const res = await request<Medicine>('/medicines', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.data as Medicine;
}

/** Bật/Tắt hiển thị thuốc */
export async function toggleMedicine(id: string): Promise<Medicine> {
  const res = await request<Medicine>(`/medicines/${id}/toggle`, {
    method: 'PATCH',
  });
  return res.data as Medicine;
}

/** Cập nhật thông tin thuốc */
export async function updateMedicine(
  id: string,
  data: {
    name?: string;
    defaultDose?: string;
    defaultDuration?: string;
    defaultNote?: string;
  }
): Promise<Medicine> {
  const res = await request<Medicine>(`/medicines/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return res.data as Medicine;
}
