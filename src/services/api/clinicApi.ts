import { request } from './apiClient';
import { Service, Dentist, Patient } from '../../types/clinic';

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
};
