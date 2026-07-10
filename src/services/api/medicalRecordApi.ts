import { request } from './apiClient';
import { MedicalRecord, ToothState } from '../../types/clinic';

export const medicalRecordApi = {
  /**
   * Lấy lịch sử bệnh án của một bệnh nhân
   */
  getByPatient: (patientId: string) => {
    const rawPatientId = patientId.split('-')[1] || patientId;
    return request<MedicalRecord[]>(`/medical-records/patients/${rawPatientId}`);
  },

  /**
   * Bác sĩ lưu hồ sơ bệnh án mới (lưu sơ đồ răng, dịch vụ thực hiện và ghi chú)
   */
  create: (data: {
    patientId: string;
    dentistId: string;
    queueTicketId?: string;
    notes: string;
    performedServices: string[];
    teeth: ToothState[];
    sessionType?: 'independent' | 'plan_init' | 'plan_session';
    treatmentPlanId?: string;
  }) => {
    const rawPatientId = data.patientId.split('-')[1] || data.patientId;
    const rawDentistId = data.dentistId.split('-')[1] || data.dentistId;
    const rawQueueId = data.queueTicketId ? (data.queueTicketId.split('-')[1] || data.queueTicketId) : undefined;
    const rawPlanId = data.treatmentPlanId ? (data.treatmentPlanId.split('-')[1] || data.treatmentPlanId) : undefined;
    const rawServices = data.performedServices.map((id) => id.split('-')[1] || id);

    // Chuẩn hóa sơ đồ răng để khớp định dạng API
    const formattedTeeth = data.teeth.map((t) => ({
      toothNumber: t.toothNumber,
      condition: t.condition,
      treatmentNote: t.treatment || '',
    }));


    return request<any>('/medical-records', {
      method: 'POST',
      body: JSON.stringify({
        patientId: rawPatientId,
        dentistId: rawDentistId,
        queueTicketId: rawQueueId,
        notes: data.notes,
        performedServices: rawServices,
        sessionType: data.sessionType || 'independent',
        treatmentPlanId: rawPlanId,
        teeth: formattedTeeth,
      }),
    });
  },
};
