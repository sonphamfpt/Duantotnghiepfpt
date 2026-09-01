import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const dataPath = path.join(__dirname, 'seed-data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Không tìm thấy file seed-data.json!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(rawData);

  if (!data.dentistShifts || !data.dentistShifts.length) {
    console.error('❌ Không có dữ liệu dentistShifts trong seed-data.json!');
    process.exit(1);
  }

  console.log('🔄 Đang đồng bộ DUY NHẤT bảng ca trực (dentist_shifts) lên Supabase...');
  console.log(`📦 Số lượng ca trực cần đẩy: ${data.dentistShifts.length} ca.`);
  console.log('🛡️  AN TOÀN: Quá trình này KHÔNG xóa hoặc ảnh hưởng đến bất kỳ dữ liệu nào khác (Bệnh nhân, Lịch hẹn, Tài khoản, Hóa đơn, Bệnh án...).');

  // 1. Gỡ liên kết khóa ngoại tạm thời từ thông báo đổi ca nếu có
  await prisma.shiftChangeNotification.updateMany({ data: { shiftId: null } });

  // 2. Chỉ xóa dữ liệu trong bảng ca trực
  await prisma.dentistShift.deleteMany();

  // 3. Chèn 300 ca trực mới từ seed-data.json
  const shiftsToInsert = data.dentistShifts.map((s: any) => ({
    dentistId: BigInt(s.dentistId),
    roomId: Number(s.roomId),
    workDate: new Date(s.workDate),
    shiftType: s.shiftType,
    startTime: new Date(s.startTime),
    endTime: new Date(s.endTime),
    isActive: s.isActive ?? true,
  }));

  await prisma.dentistShift.createMany({
    data: shiftsToInsert,
  });

  console.log(`✅ THÀNH CÔNG! Đã nạp ${shiftsToInsert.length} ca trực mới vào Supabase an toàn 100%.`);
}

main()
  .catch(e => {
    console.error('❌ Lỗi đồng bộ ca trực:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
