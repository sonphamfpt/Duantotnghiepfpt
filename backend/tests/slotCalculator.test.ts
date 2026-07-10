import { calculateAvailableSlots, TimeBlock } from '../src/utils/slotCalculator';

describe('calculateAvailableSlots', () => {
  const dateStr = '2026-07-02';

  // Hàm helper để tạo đối tượng Date giả lập kiểu Time của PostgreSQL (ở dạng 1970-01-01 UTC)
  const makeTime = (timeStr: string): Date => {
    return new Date(`1970-01-01T${timeStr}:00.000Z`);
  };

  // Hàm helper tạo đối tượng Date thật trên ngày cụ thể (ở UTC)
  const makeDateTime = (timeStr: string): Date => {
    return new Date(`${dateStr}T${timeStr}:00.000Z`);
  };

  test('Trường hợp không có lịch hẹn và không nghỉ trưa: trả về đầy đủ các slot', () => {
    const shift: TimeBlock = {
      startTime: makeTime('08:00'),
      endTime: makeTime('12:00'),
    };
    const appointments: TimeBlock[] = [];
    const lunchBreak = null;
    const serviceDuration = 30; // 30 phút khám
    const buffer = 5;          // 5 phút chuẩn bị = cần 35 phút trống
    const step = 15;

    const result = calculateAvailableSlots(
      shift,
      appointments,
      lunchBreak,
      serviceDuration,
      buffer,
      dateStr,
      step
    );

    // Slot cuối cùng có thể bắt đầu là 11:15 (kết thúc lúc 11:50, nằm trong ca trực đến 12:00)
    // Mốc 11:30 sẽ kết thúc lúc 12:05 (quá giờ ca trực) -> không hợp lệ
    expect(result).toContain(`${dateStr}T08:00:00.000Z`);
    expect(result).toContain(`${dateStr}T08:15:00.000Z`);
    expect(result).toContain(`${dateStr}T11:15:00.000Z`);
    expect(result).not.toContain(`${dateStr}T11:30:00.000Z`);
    expect(result.length).toBe(14); // 08:00, 08:15, ..., 11:15 (tổng cộng 14 slots)
  });

  test('Trường hợp có giờ nghỉ trưa: lọc bỏ các slot trùng giờ nghỉ trưa', () => {
    const shift: TimeBlock = {
      startTime: makeTime('08:00'),
      endTime: makeTime('17:00'),
    };
    const appointments: TimeBlock[] = [];
    const lunchBreak: TimeBlock = {
      startTime: makeTime('12:00'),
      endTime: makeTime('13:30'),
    };
    const serviceDuration = 45; // 45 phút khám
    const buffer = 15;         // 15 phút dọn dẹp = cần 60 phút trống
    const step = 15;

    const result = calculateAvailableSlots(
      shift,
      appointments,
      lunchBreak,
      serviceDuration,
      buffer,
      dateStr,
      step
    );

    // Slot lúc 11:00 (kết thúc lúc 12:00) -> Hợp lệ
    expect(result).toContain(`${dateStr}T11:00:00.000Z`);
    
    // Slot lúc 11:15 (kết thúc lúc 12:15, lấn vào giờ nghỉ trưa 12:00) -> Loại
    expect(result).not.toContain(`${dateStr}T11:15:00.000Z`);
    expect(result).not.toContain(`${dateStr}T12:00:00.000Z`);
    expect(result).not.toContain(`${dateStr}T13:00:00.000Z`);

    // Slot lúc 13:30 (bắt đầu ngay sau khi hết giờ nghỉ trưa) -> Hợp lệ
    expect(result).toContain(`${dateStr}T13:30:00.000Z`);
  });

  test('Trường hợp đã có lịch đặt trước: loại bỏ các slot trùng lịch khám', () => {
    const shift: TimeBlock = {
      startTime: makeTime('08:00'),
      endTime: makeTime('12:00'),
    };
    const appointments: TimeBlock[] = [
      {
        startTime: makeDateTime('09:00'),
        endTime: makeDateTime('09:30'), // Đã đặt 9h - 9h30
      },
      {
        startTime: makeDateTime('10:30'),
        endTime: makeDateTime('11:15'), // Đã đặt 10h30 - 11h15
      }
    ];
    const lunchBreak = null;
    const serviceDuration = 30; // 30 phút
    const buffer = 5;          // 5 phút = 35 phút trống
    const step = 15;

    const result = calculateAvailableSlots(
      shift,
      appointments,
      lunchBreak,
      serviceDuration,
      buffer,
      dateStr,
      step
    );

    // 08:00 -> 08:35 (OK)
    expect(result).toContain(`${dateStr}T08:00:00.000Z`);
    // 08:15 -> 08:50 (OK)
    expect(result).toContain(`${dateStr}T08:15:00.000Z`);
    // 08:30 -> 09:05 (Trùng lịch khám từ 09:00) -> Loại
    expect(result).not.toContain(`${dateStr}T08:30:00.000Z`);
    // 09:00 -> Loại (Trùng trực tiếp)
    expect(result).not.toContain(`${dateStr}T09:00:00.000Z`);
    // 09:30 -> 10:05 (OK - bắt đầu ngay sau khi hết ca khám 9:30)
    expect(result).toContain(`${dateStr}T09:30:00.000Z`);
  });

  test('Trường hợp thời lượng dịch vụ quá lớn không vừa khoảng trống nào: trả về danh sách rỗng', () => {
    const shift: TimeBlock = {
      startTime: makeTime('08:00'),
      endTime: makeTime('10:00'), // Ca trực chỉ có 2 tiếng
    };
    const appointments: TimeBlock[] = [
      {
        startTime: makeDateTime('09:00'),
        endTime: makeDateTime('09:30'), // Chia ca trực thành 2 khoảng trống 1h và 30p
      }
    ];
    const lunchBreak = null;
    const serviceDuration = 90; // Yêu cầu 90 phút khám
    const buffer = 10;         // 10 phút chuẩn bị = cần 100 phút trống
    const step = 15;

    const result = calculateAvailableSlots(
      shift,
      appointments,
      lunchBreak,
      serviceDuration,
      buffer,
      dateStr,
      step
    );

    expect(result.length).toBe(0); // Không có slot nào đủ rộng
  });
});
