import { request } from './apiClient';
import { Appointment } from '../../types/clinic';

export type BookingChannel = 'Online' | 'Phone' | 'WalkIn' | 'Staff';

export interface CreateAppointmentPayload {
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  dentistId: string;
  serviceId: string;
  startTime: string;
  bookingChannel: BookingChannel;
  patientNotes?: string;
  otpToken?: string;
}

const stripDisplayId = (id: string): string => {
  const rawId = id.split('-')[1] || id;
  return parseInt(rawId, 10).toString();
};

const normalizePhone = (phone?: string): string | undefined => {
  return phone ? phone.trim().replace(/[\s-]/g, '') : undefined;
};

export const appointmentApi = {
  /**
   * Lấy danh sách toàn bộ lịch hẹn
   */
  getAppointments: () => request<Appointment[]>('/appointments'),

  getAvailableSlots: (dentistId: string, date: string, serviceId: string) => {
    return request<string[]>(
      `/appointments/dentists/${stripDisplayId(dentistId)}/available-slots?date=${date}&serviceId=${stripDisplayId(serviceId)}`
    );
  },

  ensureSlotAvailable: async (dentistId: string, date: string, serviceId: string, startTime: string) => {
    const response = await appointmentApi.getAvailableSlots(dentistId, date, serviceId);
    const slots = response.data || [];
    const selectedSlotTime = new Date(startTime).getTime();
    const isAvailable = slots.some((slot) => new Date(slot).getTime() === selectedSlotTime);

    if (!isAvailable) {
      throw new Error('Khung giờ này vừa có người đặt hoặc không còn phù hợp với dịch vụ đã chọn. Vui lòng chọn lại giờ khám.');
    }

    return slots;
  },

  createAppointment: (payload: CreateAppointmentPayload) => {
    const { otpToken, ...body } = payload;

    return request<any>('/appointments', {
      method: 'POST',
      headers: otpToken ? { 'x-otp-token': otpToken } : undefined,
      body: JSON.stringify({
        ...body,
        patientId: body.patientId ? stripDisplayId(body.patientId) : undefined,
        patientPhone: normalizePhone(body.patientPhone),
        dentistId: stripDisplayId(body.dentistId),
        serviceId: stripDisplayId(body.serviceId),
      }),
    });
  },

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

    return appointmentApi.createAppointment({
      patientId: apptData.patientId,
      dentistId: apptData.dentistId,
      serviceId: apptData.serviceId || '',
      startTime: startTimeIso,
      bookingChannel: 'Staff',
      patientNotes: apptData.notes || '',
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
  cancel: (appointmentId: string, reason: string = 'Hủy bởi lễ tân phòng khám') => {
    const dbId = appointmentId.split('-')[1] || appointmentId;
    return request<any>(`/appointments/${dbId}/cancel`, {
      method: 'PUT',
      body: JSON.stringify({ cancelReason: reason }),
    });
  },
};
