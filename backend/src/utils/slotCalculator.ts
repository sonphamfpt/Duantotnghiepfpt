export interface TimeBlock {
  startTime: Date;
  endTime: Date;
}

export interface OccupiedBlock {
  start: number; // Unix Epoch ms
  end: number;   // Unix Epoch ms
}

const pad = (num: number): string => num.toString().padStart(2, '0');
const VIETNAM_TIMEZONE_OFFSET = '+07:00';

const buildVietnamDateTime = (dateStr: string, hours: number, minutes: number): Date => {
  return new Date(`${dateStr}T${pad(hours)}:${pad(minutes)}:00.000${VIETNAM_TIMEZONE_OFFSET}`);
};

const getVietnamDateStr = (date: Date): string => {
  const vietnamDate = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vietnamDate.toISOString().split('T')[0];
};

/**
 * Tính toán các khoảng slot trống khả dụng cho cuộc hẹn
 * @param shift Ca trực của bác sĩ
 * @param appointments Danh sách lịch hẹn đã đặt trong ngày (không bị Cancelled/NoShow)
 * @param lunchBreak Giờ nghỉ trưa (nếu có)
 * @param serviceDurationMinutes Thời lượng dịch vụ
 * @param bufferMinutes Thời lượng chuẩn bị giữa các ca
 * @param dateStr Ngày đặt lịch dạng YYYY-MM-DD
 * @param stepMinutes Khoảng cách giữa các mốc giờ lựa chọn (mặc định 15 phút)
 * @returns Danh sách các mốc thời gian bắt đầu khả dụng dưới dạng ISO String
 */
export function calculateAvailableSlots(
  shift: TimeBlock,
  appointments: TimeBlock[],
  lunchBreak: TimeBlock | null,
  serviceDurationMinutes: number,
  bufferMinutes: number,
  dateStr: string,
  stepMinutes: number = 15
): string[] {
  // 1. Chuyển đổi giờ bắt đầu/kết thúc ca trực theo giờ Việt Nam sang UTC ISO
  const shiftStartHrs = shift.startTime.getUTCHours();
  const shiftStartMins = shift.startTime.getUTCMinutes();
  const shiftEndHrs = shift.endTime.getUTCHours();
  const shiftEndMins = shift.endTime.getUTCMinutes();

  const shiftStart = buildVietnamDateTime(dateStr, shiftStartHrs, shiftStartMins);
  const shiftEnd = buildVietnamDateTime(dateStr, shiftEndHrs, shiftEndMins);

  const shiftStartMs = shiftStart.getTime();
  const shiftEndMs = shiftEnd.getTime();

  // 2. Thu thập tất cả các khoảng thời gian bị chiếm dụng (Occupied)
  const occupied: OccupiedBlock[] = [];

  // Thêm giờ nghỉ trưa vào danh sách bị chiếm dụng
  if (lunchBreak) {
    const lunchStartHrs = lunchBreak.startTime.getUTCHours();
    const lunchStartMins = lunchBreak.startTime.getUTCMinutes();
    const lunchEndHrs = lunchBreak.endTime.getUTCHours();
    const lunchEndMins = lunchBreak.endTime.getUTCMinutes();

    const lunchStart = buildVietnamDateTime(dateStr, lunchStartHrs, lunchStartMins);
    const lunchEnd = buildVietnamDateTime(dateStr, lunchEndHrs, lunchEndMins);

    occupied.push({
      start: lunchStart.getTime(),
      end: lunchEnd.getTime(),
    });
  }

  // Thêm các lịch hẹn hiện tại vào danh sách bị chiếm dụng
  for (const app of appointments) {
    occupied.push({
      start: app.startTime.getTime(),
      end: app.endTime.getTime(),
    });
  }

  // Sắp xếp các khoảng bận theo thời gian bắt đầu
  occupied.sort((a, b) => a.start - b.start);

  // Trộn (merge) các khoảng bận chồng chéo
  const mergedOccupied: OccupiedBlock[] = [];
  for (const block of occupied) {
    if (mergedOccupied.length === 0) {
      mergedOccupied.push({ ...block });
    } else {
      const last = mergedOccupied[mergedOccupied.length - 1];
      if (block.start < last.end) {
        last.end = Math.max(last.end, block.end);
      } else {
        mergedOccupied.push({ ...block });
      }
    }
  }

  // 3. Tính toán các slot khả dụng
  const slots: string[] = [];
  const stepMs = stepMinutes * 60 * 1000;
  const serviceNeededMs = (serviceDurationMinutes + bufferMinutes) * 60 * 1000;
  const nowMs = Date.now();
  const isToday = dateStr === getVietnamDateStr(new Date());

  let currentSlotStart = shiftStartMs;

  // Lặp qua các mốc thời gian cách nhau stepMinutes
  while (currentSlotStart + serviceNeededMs <= shiftEndMs) {
    const currentSlotEnd = currentSlotStart + serviceNeededMs;

    // Kiểm tra xem slot hiện tại có bị chồng chéo với bất kỳ khoảng bận nào không
    let isOverlap = false;
    for (const block of mergedOccupied) {
      // Một slot trùng khi: start1 < end2 và end1 > start2
      if (currentSlotStart < block.end && currentSlotEnd > block.start) {
        isOverlap = true;
        break;
      }
    }

    // Nếu không chồng chéo, đây là một mốc giờ khả dụng hợp lệ
    if (!isOverlap && (!isToday || currentSlotStart > nowMs)) {
      slots.push(new Date(currentSlotStart).toISOString());
    }

    // Tăng mốc giờ theo step
    currentSlotStart += stepMs;
  }

  return slots;
}
