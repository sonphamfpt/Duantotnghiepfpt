import { request } from './apiClient';
import { Appointment } from '../../types/clinic';

export const appointmentApi = {
  /**
   * Lấy danh sách toàn bộ lịch hẹn
   */
  getAppointments: () => request<Appointment[]>('/appointments'),

  /**
   * Tạo lịch hẹn khám mới
   */
  create: (apptData: Omit<Appointment, 'id' | 'status'> & { serviceId?: string; notes?: string }) => {

    let startTimeIso = new Date().toISOString();
    
    // Xử lý chuyển đổi thời gian chuỗi "DD/MM/YYYY @ HH:MM" thành ISO string
    if (apptData.time.includes('@')) {
      const [datePart, timePart] = apptData.time.split('@').map((s) => s.trim());
      const [hh, mm] = timePart.split(':').map((s) => s.trim());
      let ymd = datePart;
      if (datePart.includes('/')) {
        const [d, m, y] = datePart.split('/');
        ymd = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      const localDate = new Date(`${ymd}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+07:00`);
      if (!isNaN(localDate.getTime())) {
        startTimeIso = localDate.toISOString();
      }
    }

    const rawPatientId = apptData.patientId.split('-')[1] || apptData.patientId;
    const rawDentistId = apptData.dentistId.split('-')[1] || apptData.dentistId;
    const rawServiceId = apptData.serviceId ? (apptData.serviceId.split('-')[1] || apptData.serviceId) : undefined;

    return request<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patientId: rawPatientId,
        dentistId: rawDentistId,
        serviceId: rawServiceId,
        startTime: startTimeIso,
        notes: apptData.notes || '',
      }),
    });
  },

  /**
   * Đổi lịch hẹn sang ngày/giờ mới hoặc bác sĩ khác
   */
  reschedule: (appointmentId: string, newTime: string, newDentistId?: string) => {
    const dbId = appointmentId.split('-')[1] || appointmentId;
    const rawDentistId = newDentistId ? (newDentistId.split('-')[1] || newDentistId) : undefined;
    return request<any>(`/appointments/${dbId}/reschedule`, {
      method: 'PUT',
      body: JSON.stringify({
        newTime,
        newDentistId: rawDentistId,
      }),
    });
  },

  /**
   * Hủy lịch hẹn
   */
  cancel: (appointmentId: string) => {
    const dbId = appointmentId.split('-')[1] || appointmentId;
    return request<any>(`/appointments/${dbId}/cancel`, {
      method: 'PUT',
    });
  },
};
