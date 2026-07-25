/**
 * Utility functions for Doctor Shift and Booking Time Slot synchronization.
 */

/**
 * Normalizes and compares two Dentist IDs (e.g. 'D-01', 'D-1', '1').
 */
export const isSameDentistId = (id1?: string | null, id2?: string | null): boolean => {
  if (!id1 || !id2) return false;
  const d1 = String(id1).trim();
  const d2 = String(id2).trim();
  if (d1 === d2) return true;
  return d1.replace(/^D-?0*/i, '') === d2.replace(/^D-?0*/i, '');
};

/**
 * Extracts Vietnam Time (UTC+7) hour from an ISO date string.
 */
export const getVietnamHour = (isoStr: string): number => {
  const dateObj = new Date(isoStr);
  if (isNaN(dateObj.getTime())) return 0;
  const vnDate = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  return vnDate.getUTCHours();
};

export interface ShiftLike {
  shiftType: string;
  dentistId?: string;
  date?: string;
}

/**
 * Checks if a given slot ISO string falls within the active shifts of a doctor.
 * Returns false if the doctor has no active shifts on that day.
 */
export const isSlotInDoctorShifts = (
  slotIso: string,
  activeShiftsForDoc: ShiftLike[]
): boolean => {
  if (!activeShiftsForDoc || activeShiftsForDoc.length === 0) {
    return false; // Doctor is not on duty -> no slots available
  }

  const slotDate = new Date(slotIso);
  const vnDate = new Date(slotDate.getTime() + 7 * 60 * 60 * 1000);
  const hour = vnDate.getUTCHours();
  const min = vnDate.getUTCMinutes();
  const slotMinutes = hour * 60 + min;

  return activeShiftsForDoc.some(shift => {
    if (shift.shiftType === 'Morning') {
      // 08:00 (480m) to 14:00 (840m)
      return slotMinutes >= 480 && slotMinutes < 840;
    }
    if (shift.shiftType === 'Afternoon') {
      // 14:00 (840m) to 20:00 (1200m)
      return slotMinutes >= 840 && slotMinutes < 1200;
    }
    if (shift.shiftType === 'Full') {
      // 08:00 (480m) to 20:00 (1200m)
      return slotMinutes >= 480 && slotMinutes < 1200;
    }
    return false;
  });
};
