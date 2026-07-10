import { log } from 'console';

const BASE_URL = 'http://localhost:5000/api';

async function runShiftTests() {
  log('========================================================');
  log('🚀 BẮT ĐẦU CHẠY THỬ NGHIỆM - MODULE CA TRỰC & ĐỔI CA (DENTIST SHIFTS)');
  log('========================================================');

  let successCount = 0;
  let failCount = 0;

  function report(testName: string, passed: boolean, message?: string) {
    if (passed) {
      successCount++;
      log(`✔️  [SUCCESS] ${testName}`);
    } else {
      failCount++;
      log(`❌ [FAILED] ${testName}`);
      if (message) log(`   ↳ Chi tiết: ${message}`);
    }
  }

  // Bước 1: Đăng ký một bệnh nhân test
  const testPhone = `097${Math.floor(1000000 + Math.random() * 9000000)}`;
  let patientId = '';

  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bệnh Nhân Test Ca Trực',
        phone: testPhone,
        password: 'password123',
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      patientId = data.data.user.patientId;
      report(`TC-01: Đăng ký bệnh nhân test thành công (ID: ${patientId})`, true);
    } else {
      report('TC-01: Đăng ký bệnh nhân test thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-01: Đăng ký bệnh nhân test thất bại', false, err.message);
    return;
  }

  // Bước 2: Thiết lập ca trực cho ngày mai
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2); // Cộng thêm 2 ngày cho chắc chắn trống lịch
  const dateStr = tomorrow.toISOString().split('T')[0];

  let shiftIdA = '';
  let shiftIdB = '';

  try {
    // 2.1 Tạo ca trực Morning cho Dentist A (ID: 1)
    const resA = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dentistId: '1',
        workDate: dateStr,
        shiftType: 'Morning',
        roomId: 1,
      }),
    });
    const dataA: any = await resA.json();

    // 2.2 Tạo ca trực Morning cho Dentist B (ID: 2)
    const resB = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dentistId: '2',
        workDate: dateStr,
        shiftType: 'Morning',
        roomId: 2,
      }),
    });
    const dataB: any = await resB.json();

    if (resA.status === 201 && resB.status === 201) {
      shiftIdA = dataA.data.shiftId;
      shiftIdB = dataB.data.shiftId;
      report(`TC-02: Thiết lập ca trực ngày mai thành công (Ca A: ${shiftIdA}, Ca B: ${shiftIdB})`, true);
    } else {
      report('TC-02: Thiết lập ca trực ngày mai thất bại', false, `A: ${JSON.stringify(dataA)}, B: ${JSON.stringify(dataB)}`);
      return;
    }
  } catch (err: any) {
    report('TC-02: Thiết lập ca trực ngày mai thất bại', false, err.message);
    return;
  }

  // Bước 3: Tạo lịch hẹn với Dentist A vào sáng ngày mai (Khung giờ Morning: 09:00 AM)
  let appointmentId = '';
  try {
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        serviceId: '1',
        roomId: 1,
        startTime: `${dateStr}T02:00:00.000Z`, // 09:00 AM local
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      appointmentId = data.data.appointmentId;
      report(`TC-03: Đăng ký lịch hẹn khám thành công (Lịch hẹn ID: ${appointmentId})`, true);
    } else {
      report('TC-03: Đăng ký lịch hẹn khám thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-03: Đăng ký lịch hẹn khám thất bại', false, err.message);
    return;
  }

  // Bước 4: Thực hiện hoán đổi ca trực (Swap) giữa Dentist A và Dentist B
  // Mong đợi: Đổi ca trực thành công, tự động phát hiện lịch hẹn bị ảnh hưởng và tạo thông báo SCN
  try {
    const res = await fetch(`${BASE_URL}/shifts/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId1: shiftIdA,
        shiftId2: shiftIdB,
      }),
    });
    const data: any = await res.json();
    if (res.status === 200) {
      report('TC-04: Hoán đổi ca trực giữa hai bác sĩ thành công', true);
    } else {
      report('TC-04: Hoán đổi ca trực giữa hai bác sĩ thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-04: Hoán đổi ca trực giữa hai bác sĩ thất bại', false, err.message);
    return;
  }

  // Bước 5: Kiểm tra thông báo đổi ca trực cho lễ tân
  let notifId = '';
  try {
    const res = await fetch(`${BASE_URL}/shifts/notifications`);
    const data: any = await res.json();
    if (res.status === 200 && Array.isArray(data.data) && data.data.length > 0) {
      // Tìm thông báo đổi ca liên quan tới cuộc hẹn của chúng ta
      const matchedNotif = data.data.find((n: any) => 
        n.affectedItems.some((item: any) => item.appointmentId === appointmentId.toString())
      );

      if (matchedNotif) {
        notifId = matchedNotif.id; // SCN-number format
        const itemsCount = matchedNotif.affectedItems.length;
        report(`TC-05: Tìm thấy thông báo đổi ca trực bị xung đột (Mã: ${notifId}, Số cuộc hẹn bị ảnh hưởng: ${itemsCount})`, true);
      } else {
        report('TC-05: Kiểm tra thông báo đổi ca trực thất bại', false, 'Không tìm thấy thông báo liên quan.');
        return;
      }
    } else {
      report('TC-05: Kiểm tra thông báo đổi ca trực thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-05: Kiểm tra thông báo đổi ca trực thất bại', false, err.message);
    return;
  }

  // Bước 6: Lễ tân giải quyết xung đột lịch hẹn: Bệnh nhân đồng ý đổi sang Bác sĩ mới (Dentist B - ID: 2)
  try {
    // Tách mã số thực tế từ SCN-X
    const rawNotifId = notifId.split('-')[1] || notifId;
    const res = await fetch(`${BASE_URL}/shifts/notifications/${rawNotifId}/resolve-item/${appointmentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updated',
      }),
    });
    const data: any = await res.json();
    if (res.status === 200 && data.data.success === true) {
      report('TC-06: Lễ tân cập nhật lịch hẹn sang bác sĩ trực ca mới thành công', true);
    } else {
      report('TC-06: Lễ tân cập nhật lịch hẹn thất bại', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-06: Lễ tân cập nhật lịch hẹn thất bại', false, err.message);
  }

  // Bước 7: Xác nhận cuộc hẹn được cập nhật bác sĩ trực mới thành công
  try {
    const res = await fetch(`${BASE_URL}/appointments`);
    const data: any = await res.json();
    if (res.status === 200 && Array.isArray(data.data)) {
      const appt = data.data.find((a: any) => a.id === `A-${appointmentId}`);
      if (appt && appt.dentistId === 'D-02') {
        report('TC-07: Xác nhận lịch hẹn đã chuyển sang Bác sĩ 2 chính xác', true);
      } else {
        report('TC-07: Xác nhận lịch hẹn cập nhật thất bại', false, `Bác sĩ hiện tại: ${appt?.dentistId}`);
      }
    } else {
      report('TC-07: Xác nhận lịch hẹn cập nhật thất bại', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-07: Xác nhận lịch hẹn cập nhật thất bại', false, err.message);
  }

  // Bước 8: Chuyển giao ca trực (Transfer) ca chiều (Afternoon) của Bác sĩ 2 sang Bác sĩ 1
  // Sử dụng ngày cách xa (ngày mai + 10) để tránh trùng lịch ca trực đã seed sẵn của Bác sĩ 1
  const farFuture = new Date();
  farFuture.setDate(farFuture.getDate() + 10);
  const dateStr2 = farFuture.toISOString().split('T')[0];

  let shiftIdC = '';
  let appointmentId2 = '';
  try {
    const resShiftC = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dentistId: '2',
        workDate: dateStr2,
        shiftType: 'Afternoon',
        roomId: 2,
      }),
    });
    const dataShiftC: any = await resShiftC.json();
    shiftIdC = dataShiftC.data.shiftId;

    // Tạo lịch hẹn trùng ca chiều với Bác sĩ 2 (Khung giờ Afternoon: 03:00 PM local = 08:00 AM UTC)
    const resAppt2 = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '2',
        serviceId: '1',
        roomId: 2,
        startTime: `${dateStr2}T08:00:00.000Z`,
      }),
    });
    const dataAppt2: any = await resAppt2.json();
    appointmentId2 = dataAppt2.data.appointmentId;

    // Chuyển ca trực chiều từ Bác sĩ 2 sang Bác sĩ 1
    const resTransfer = await fetch(`${BASE_URL}/shifts/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId: shiftIdC,
        targetDentistId: '1',
      }),
    });
    
    if (resTransfer.status === 200) {
      report('TC-08: Chuyển giao ca trực (Transfer) chiều sang Bác sĩ 1 thành công', true);
    } else {
      const transferData = await resTransfer.json();
      report('TC-08: Chuyển giao ca trực thất bại', false, JSON.stringify(transferData));
      return;
    }
  } catch (err: any) {
    report('TC-08: Chuyển giao ca trực thất bại', false, err.message);
    return;
  }

  // Bước 9: Giải quyết xung đột thứ 2 bằng cách HỦY lịch hẹn (cancelled)
  try {
    // Tìm thông báo đổi ca mới
    const notifRes = await fetch(`${BASE_URL}/shifts/notifications`);
    const notifData: any = await notifRes.json();
    const matchedNotif = notifData.data.find((n: any) => 
      n.affectedItems.some((item: any) => item.appointmentId === appointmentId2.toString())
    );

    if (matchedNotif) {
      const rawNotifId = matchedNotif.id.split('-')[1];
      const res = await fetch(`${BASE_URL}/shifts/notifications/${rawNotifId}/resolve-item/${appointmentId2}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancelled',
        }),
      });
      const data: any = await res.json();
      if (res.status === 200 && data.data.success === true) {
        report('TC-09: Lễ tân hủy lịch hẹn trùng ca trực do bệnh nhân từ chối đổi bác sĩ thành công', true);
      } else {
        report('TC-09: Lễ tân hủy lịch hẹn thất bại', false, JSON.stringify(data));
      }
    } else {
      report('TC-09: Không tìm thấy thông báo xung đột ca trực thứ hai', false);
    }
  } catch (err: any) {
    report('TC-09: Lễ tân hủy lịch hẹn thất bại', false, err.message);
  }

  // Bước 10: Xác nhận trạng thái lịch hẹn 2 là Cancelled
  try {
    const res = await fetch(`${BASE_URL}/appointments`);
    const data: any = await res.json();
    if (res.status === 200 && Array.isArray(data.data)) {
      const appt = data.data.find((a: any) => a.id === `A-${appointmentId2}`);
      if (appt && appt.status === 'Cancelled') {
        report('TC-10: Xác nhận trạng thái lịch hẹn bị ảnh hưởng chuyển sang CANCELLED chính xác', true);
      } else {
        report('TC-10: Xác nhận trạng thái lịch hẹn hủy thất bại', false, `Status hiện tại: ${appt?.status}`);
      }
    } else {
      report('TC-10: Xác nhận trạng thái lịch hẹn hủy thất bại', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-10: Xác nhận trạng thái lịch hẹn hủy thất bại', false, err.message);
  }

  log('\n========================================================');
  log(`📊 TỔNG KẾT THỬ NGHIỆM CA TRỰC: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
  log('========================================================');
}

runShiftTests();
