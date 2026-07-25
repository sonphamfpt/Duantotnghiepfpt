import { request } from './apiClient';
import { Service, Dentist, Patient } from '../../types/clinic';

export interface PatientLookupResult {
  found: boolean;
  patientId?: string;
  fullName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  isLocked?: boolean;
  hasAccount?: boolean;
}

export const clinicApi = {
  /**
   * Lấy danh sách tất cả dịch vụ (chỉ dịch vụ đang hoạt động - dùng cho trang public)
   */
  getServices: () => request<Service[]>('/services'),

  /**
   * Lấy TẤT CẢ dịch vụ bao gồm đã tắt (dùng cho trang quản lý Manager Settings)
   */
  getAllServices: () => request<Service[]>('/services/all'),

  /**
   * Lấy danh sách tất cả bác sĩ
   */
  getDentists: () => request<Dentist[]>('/dentists'),

  /**
   * Lấy danh sách tất cả bệnh nhân
   */
  getPatients: () => request<Patient[]>('/patients'),

  /**
   * Lấy danh sách nhật ký hệ thống
   */
  getLogs: () => request<any[]>('/logs'),

  /**
   * Tra cứu bệnh nhân theo số điện thoại (lễ tân dùng khi check-in)
   */
  lookupPatientByPhone: (phone: string) =>
    request<PatientLookupResult>(`/patients/lookup?phone=${encodeURIComponent(phone)}`),

  /**
   * Tạo hồ sơ bệnh nhân mới (lễ tân)
   */
  createPatient: (patient: Omit<Patient, 'id' | 'points' | 'tier' | 'balance' | 'age'> & { dateOfBirth?: string }) =>
    request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    }),

  addService: (data: { name: string; price: number; durationMin: number }) =>
    request<any>('/services', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateServicePrice: (id: string, price: number) => {
    const rawId = id.split('-')[1] || id;
    return request<any>(`/services/${rawId}`, {
      method: 'PUT',
      body: JSON.stringify({ price }),
    });
  },

  toggleServiceActive: (id: string) => {
    const rawId = id.split('-')[1] || id;
    return request<any>(`/services/${rawId}/active`, {
      method: 'PATCH',
    });
  },

  /**
   * Cập nhật thông tin bệnh nhân (lễ tân / quản lý)
   */
  updatePatient: (patientId: string, details: {
    name?: string;
    phone?: string;
    criticalAllergy?: string;
    condition?: string;
    gender?: string;
    dateOfBirth?: string; // định dạng YYYY-MM-DD
    address?: string;
  }) => {
    return request<any>(`/patients/${patientId}`, {
      method: 'PATCH',
      body: JSON.stringify(details),
    });
  },

  /**
   * Khóa tài khoản bệnh nhân
   */
  lockPatient: (patientId: string, reason?: string) => {
    return request<any>(`/patients/${patientId}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Mở khóa tài khoản bệnh nhân
   */
  unlockPatient: (patientId: string) => {
    return request<any>(`/patients/${patientId}/unlock`, {
      method: 'PATCH',
    });
  },

  /**
   * Lấy chi tiết hồ sơ 1 bác sĩ theo ID (ví dụ D-01)
   */
  getDentistDetail: (id: string) => request<any>(`/dentists/${id}`),

  /**
   * Cập nhật hồ sơ bác sĩ chuyên sâu (Admin/Manager)
   */
  updateDentist: (id: string, payload: {
    name?: string;
    specialty?: string;
    degree?: string;
    experienceYears?: number;
    casesHandled?: string;
    motto?: string;
    bio?: string;
    education?: string[];
    certifications?: string[];
    clinicalStrengths?: string[];
    workHistory?: { periodText?: string; description: string }[];
  }) =>
    request<any>(`/dentists/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  /**
   * Ngưng hoạt động / Khóa bác sĩ
   */
  deleteDentist: (id: string) =>
    request<any>(`/dentists/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Lấy danh sách phòng khám
   */
  getRooms: () => request<any[]>('/rooms'),

  /**
   * Cập nhật phòng khám (tên, trạng thái)
   */
  updateRoom: (roomId: number, data: { name?: string; isActive?: boolean }) =>
    request<any>(`/rooms/${roomId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Tạo phòng khám mới
   */
  createRoom: (data: { name: string }) =>
    request<any>('/rooms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Lấy giờ hoạt động phòng khám (7 ngày trong tuần)
   */
  getOperatingHours: () => request<any[]>('/rooms/operating-hours'),

  /**
   * Cập nhật giờ hoạt động của 1 ngày
   */
  updateOperatingHour: (weekday: number, data: {
    openTime?: string;
    closeTime?: string;
    lunchStart?: string | null;
    lunchEnd?: string | null;
    isClosed?: boolean;
  }) =>
    request<any>(`/rooms/operating-hours/${weekday}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /**
   * Lấy danh sách hạng thành viên
   */
  getMembershipTiers: () => request<any[]>('/patients/tiers'),

  /**
   * Cập nhật hạng thành viên (% giảm giá, ngưỡng điểm)
   */
  updateMembershipTier: (tierId: number, data: { discountPercent?: number; minPoints?: number; name?: string }) =>
    request<any>(`/patients/tiers/${tierId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
