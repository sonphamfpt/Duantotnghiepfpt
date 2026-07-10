import { request } from './apiClient';
import { QueueItem } from '../../types/clinic';

export const queueApi = {
  /**
   * Lấy danh sách hàng chờ khám hôm nay
   */
  getQueue: () => request<QueueItem[]>('/queues'),

  /**
   * Lễ tân check-in đưa bệnh nhân vào hàng chờ
   */
  checkIn: (patientId: string, dentistId: string, customRoom?: string, serviceName?: string) => {
    const rawPatientId = patientId.split('-')[1] || patientId;
    const rawDentistId = dentistId.split('-')[1] || dentistId;
    return request<any>('/queues/checkin', {
      method: 'POST',
      body: JSON.stringify({
        patientId: rawPatientId,
        dentistId: rawDentistId,
        serviceName,
        customRoom,
      }),
    });
  },

  /**
   * Cập nhật trạng thái hàng chờ của bệnh nhân (Waiting, In Chair, Completed)
   */
  updateStatus: (queueId: string, status: string) => {
    const rawQueueId = queueId.split('-')[1] || queueId;
    // Đồng bộ string của frontend sang enum của backend
    const dbStatus = (status === 'InChair' || status === 'In Chair') ? 'InChair' : status;
    return request<any>(`/queues/${rawQueueId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: dbStatus }),
    });
  },
};
