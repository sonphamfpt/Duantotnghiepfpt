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
   * Lấy danh sách tất cả dịch vụ
   */
  getServices: () => request<Service[]>('/services'),

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
};
