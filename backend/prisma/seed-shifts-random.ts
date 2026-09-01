import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const DENTISTS = [
  { dentistId: 1n, name: 'BS. Lê Minh', roomId: 1 },
  { dentistId: 2n, name: 'BS. Hoàng Nam', roomId: 2 },
  { dentistId: 3n, name: 'BS. Mai Lan', roomId: 3 },
  { dentistId: 4n, name: 'BS. Nguyễn Hương', roomId: 4 },
];

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function main() {
  console.log('🔄 Đang tạo ngẫu nhiên lịch làm việc cho các bác sĩ...');

  // Start from 2026-08-01 to 2026-09-30 (61 days)
  const startDate = new Date('2026-08-01T00:00:00.000Z');
  const endDate = new Date('2026-09-30T00:00:00.000Z');

  const shiftsToCreate: Array<{
    shiftId?: bigint;
    dentistId: bigint;
    roomId: number;
    workDate: Date;
    shiftType: 'Morning' | 'Afternoon';
    startTime: Date;
    endTime: Date;
    isActive: boolean;
  }> = [];

  const morningStart = new Date('1970-01-01T08:00:00.000Z');
  const morningEnd = new Date('1970-01-01T14:00:00.000Z');
  const afternoonStart = new Date('1970-01-01T14:00:00.000Z');
  const afternoonEnd = new Date('1970-01-01T20:00:00.000Z');

  let cur = new Date(startDate);
  let idCounter = 1;

  while (cur <= endDate) {
    const dayOfWeek = cur.getUTCDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    const dateStr = fmt(cur);
    const isSpecialCurrentWeek = dateStr >= '2026-08-31' && dateStr <= '2026-09-06';

    for (const doc of DENTISTS) {
      const docNum = Number(doc.dentistId);
      
      // Determine shifts for this doctor on this day
      let wantMorning = false;
      let wantAfternoon = false;

      if (isSpecialCurrentWeek) {
        // Deterministic & rich distribution for current week 31/08 - 06/09
        if (dateStr === '2026-08-31') { // Thứ Hai
          if (docNum === 1) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 2) { wantMorning = true; wantAfternoon = false; }
          if (docNum === 3) { wantMorning = false; wantAfternoon = true; }
          if (docNum === 4) { wantMorning = true; wantAfternoon = true; }
        } else if (dateStr === '2026-09-01') { // Thứ Ba (Hôm nay)
          if (docNum === 1) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 2) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 3) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 4) { wantMorning = true; wantAfternoon = false; }
        } else if (dateStr === '2026-09-02') { // Thứ Tư (Lễ 2/9 - BS Lê Minh làm cả sáng + chiều thay vì 'Cả ngày')
          if (docNum === 1) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 2) { wantMorning = true; wantAfternoon = false; }
          if (docNum === 3) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 4) { wantMorning = false; wantAfternoon = true; }
        } else if (dateStr === '2026-09-03') { // Thứ Năm
          if (docNum === 1) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 2) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 3) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 4) { wantMorning = true; wantAfternoon = true; }
        } else if (dateStr === '2026-09-04') { // Thứ Sáu
          if (docNum === 1) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 2) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 3) { wantMorning = true; wantAfternoon = false; }
          if (docNum === 4) { wantMorning = false; wantAfternoon = true; }
        } else if (dateStr === '2026-09-05') { // Thứ Bảy
          if (docNum === 1) { wantMorning = true; wantAfternoon = false; }
          if (docNum === 2) { wantMorning = false; wantAfternoon = true; }
          if (docNum === 3) { wantMorning = true; wantAfternoon = true; }
          if (docNum === 4) { wantMorning = true; wantAfternoon = false; }
        } else if (dateStr === '2026-09-06') { // Chủ Nhật
          if (docNum === 1) { wantMorning = false; wantAfternoon = true; }
          if (docNum === 2) { wantMorning = true; wantAfternoon = false; }
          if (docNum === 3) { wantMorning = false; wantAfternoon = false; }
          if (docNum === 4) { wantMorning = true; wantAfternoon = true; }
        }
      } else {
        // Realistic pseudo-random pattern for other weeks based on doctor ID & date
        const seed = (cur.getTime() / 86400000 + docNum * 7) % 100;
        
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Thứ 2 -> Thứ 6
          if (seed < 40) {
            // Cả 2 ca
            wantMorning = true;
            wantAfternoon = true;
          } else if (seed < 70) {
            // Ca sáng
            wantMorning = true;
          } else if (seed < 90) {
            // Ca chiều
            wantAfternoon = true;
          } else {
            // Nghỉ phép
          }
        } else { // Cuối tuần (T7, CN)
          if (seed < 25) {
            wantMorning = true;
          } else if (seed < 50) {
            wantAfternoon = true;
          } else if (seed < 65) {
            wantMorning = true;
            wantAfternoon = true;
          }
        }
      }

      const workDate = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate()));

      if (wantMorning) {
        shiftsToCreate.push({
          dentistId: doc.dentistId,
          roomId: doc.roomId,
          workDate,
          shiftType: 'Morning',
          startTime: morningStart,
          endTime: morningEnd,
          isActive: true,
        });
      }

      if (wantAfternoon) {
        shiftsToCreate.push({
          dentistId: doc.dentistId,
          roomId: doc.roomId,
          workDate,
          shiftType: 'Afternoon',
          startTime: afternoonStart,
          endTime: afternoonEnd,
          isActive: true,
        });
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  console.log(`📊 Tổng số ca trực được tạo: ${shiftsToCreate.length}`);

  // Xóa sạch ca trực cũ và chèn mới vào DB
  console.log('🧹 Xóa ca trực cũ...');
  await prisma.shiftChangeNotification.updateMany({ data: { shiftId: null } });
  await prisma.dentistShift.deleteMany();

  console.log('💾 Đang lưu ca trực mới vào Database...');
  await prisma.dentistShift.createMany({
    data: shiftsToCreate,
  });
  console.log('✅ Đã lưu thành công vào Database!');

  // Export lại vào seed-data.json để đồng bộ
  const dataPath = path.join(__dirname, 'seed-data.json');
  if (fs.existsSync(dataPath)) {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(rawData);

    // Lấy lại danh sách từ DB để có shiftId tự tăng chính xác
    const dbShifts = await prisma.dentistShift.findMany({
      orderBy: { shiftId: 'asc' },
    });

    data.dentistShifts = dbShifts.map(s => ({
      shiftId: s.shiftId.toString(),
      dentistId: s.dentistId.toString(),
      roomId: s.roomId,
      workDate: s.workDate.toISOString(),
      shiftType: s.shiftType,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime.toISOString(),
      isActive: s.isActive,
    }));

    if (data._summary) {
      data._summary.dentistShifts = data.dentistShifts.length;
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Đã cập nhật seed-data.json (${data.dentistShifts.length} ca trực).`);
  }
}

main()
  .catch(e => {
    console.error('❌ Lỗi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
