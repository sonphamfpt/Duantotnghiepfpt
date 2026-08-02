import { request } from './apiClient';
import { DoctorShift, ShiftChangeNotification } from '../../types/clinic';

export const shiftApi = {
  /**
   * Lấy lịch trực tháng hiện tại của tất cả bác sĩ
   */
  getShifts: () => request<DoctorShift[]>('/shifts'),

  /**
   * Lấy danh sách thông báo đổi/chuyển ca đang chờ phê duyệt
   */
  getNotifications: () => request<ShiftChangeNotification[]>('/shifts/notifications'),

  /**
   * Yêu cầu hoán đổi ca trực giữa hai bác sĩ
   */
  swap: (shiftId1: string, shiftId2: string, conflictAppointmentIds?: string[]) => {
    const rawShiftId1 = shiftId1.split('-')[1] || shiftId1;
    const rawShiftId2 = shiftId2.split('-')[1] || shiftId2;
    const rawApptIds = conflictAppointmentIds?.map((id) => id.split('-')[1] || id);
    
    return request<any>('/shifts/swap', {
      method: 'POST',
      body: JSON.stringify({
        shiftId1: rawShiftId1,
        shiftId2: rawShiftId2,
        conflictAppointmentIds: rawApptIds,
      }),
    });
  },

  /**
   * Chuyển giao ca trực cho bác sĩ khác
   */
  transfer: (shiftId: string, targetDentistId: string, conflictAppointmentIds?: string[]) => {
    const rawShiftId = shiftId.split('-')[1] || shiftId;
    const rawDentistId = targetDentistId.split('-')[1] || targetDentistId;
    const rawApptIds = conflictAppointmentIds?.map((id) => id.split('-')[1] || id);

    return request<any>('/shifts/transfer', {
      method: 'POST',
      body: JSON.stringify({
        shiftId: rawShiftId,
        targetDentistId: rawDentistId,
        conflictAppointmentIds: rawApptIds,
      }),
    });
  },

  /**
   * Đồng ý hoặc Từ chối yêu cầu đổi/chuyển ca trực (Quản lý duyệt)
   */
  resolveConflict: (notifId: string, appointmentId: string, action: 'approve' | 'reject') => {
    const rawNotifId = notifId.split('-')[1] || notifId;
    const rawApptId = appointmentId.split('-')[1] || appointmentId;
    // Backend Zod schema chỉ chấp nhận 'updated' | 'cancelled'
    const backendAction = action === 'approve' ? 'updated' : 'cancelled';
    return request<any>(`/shifts/notifications/${rawNotifId}/resolve-item/${rawApptId}`, {
      method: 'POST',
      body: JSON.stringify({ action: backendAction }),
    });
  },

  createShift: (data: { dentistId: string; workDate: string; shiftType: string; roomId?: number | string }) => {
    const rawDentistId = data.dentistId.split('-')[1] || data.dentistId;
    return request<any>('/shifts', {
      method: 'POST',
      body: JSON.stringify({
        dentistId: rawDentistId,
        workDate: data.workDate,
        shiftType: data.shiftType,
        ...(data.roomId ? { roomId: data.roomId } : {}),
      }),
    });
  },

  deleteShift: (shiftId: string) => {
    const rawShiftId = shiftId.split('-')[1] || shiftId;
    return request<any>(`/shifts/${rawShiftId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Cập nhật phòng trực cho một ca (thay vì tạo mới)
   */
  updateShiftRoom: (shiftId: string, roomId: number | string) => {
    const rawShiftId = shiftId.split('-')[1] || shiftId;
    return request<any>(`/shifts/${rawShiftId}/room`, {
      method: 'PATCH',
      body: JSON.stringify({ roomId }),
    });
  },
};
