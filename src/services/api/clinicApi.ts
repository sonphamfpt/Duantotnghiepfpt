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
};
