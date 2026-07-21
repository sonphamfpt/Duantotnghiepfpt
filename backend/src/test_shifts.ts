import { log } from 'console';
import { redis } from './config/redis';

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

  // Helper to obtain OTP token automatically from local Redis
  async function getOtpToken(phone: string): Promise<string> {
    const sendRes = await fetch(`${BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!sendRes.ok) {
      const sendData = await sendRes.json();
      throw new Error(`Send OTP failed: ${JSON.stringify(sendData)}`);
    }

    const code = await redis.get(`otp:${phone}`);
    if (!code) {
      throw new Error(`OTP not found in Redis for phone ${phone}`);
    }

    const verifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const verifyData: any = await verifyRes.json();
    if (!verifyRes.ok || !verifyData.data?.otpToken) {
      throw new Error(`Verify OTP failed: ${JSON.stringify(verifyData)}`);
    }

    return verifyData.data.otpToken;
  }

  // Bước 1: Đăng ký một bệnh nhân test
  const testPhone = `097${Math.floor(1000000 + Math.random() * 9000000)}`;
  let patientId = '';
  let patientToken = '';

  try {
    const otpToken = await getOtpToken(testPhone);
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bệnh Nhân Test Ca Trực',
        phone: testPhone,
        password: 'password123',
        otpToken,
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      patientId = data.data.user.patientId;
      patientToken = data.data.token;
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
  const randomOffset = Math.floor(5 + Math.random() * 20); // Tránh trùng lặp giữa các lần chạy
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + randomOffset);
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
    const otpToken = await getOtpToken(testPhone);
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
        'x-otp-token': otpToken
      },
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
  // Sử dụng ngày cách xa (ngày mai + 30 + random) để tránh trùng lịch ca trực đã seed sẵn của Bác sĩ 1
  const randomOffset2 = Math.floor(30 + Math.random() * 50);
  const farFuture = new Date();
  farFuture.setDate(farFuture.getDate() + randomOffset2);
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
    const otpToken2 = await getOtpToken(testPhone);
    const resAppt2 = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
        'x-otp-token': otpToken2
      },
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

  // Bước 11: Kiểm thử tính năng xóa ca trực trống (TC-11)
  let testShiftId = '';
  try {
    const resCreate = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dentistId: '1',
        workDate: dateStr,
        shiftType: 'Afternoon',
        roomId: 1,
      }),
    });
    const dataCreate: any = await resCreate.json();
    testShiftId = dataCreate.data.shiftId;

    const resDelete = await fetch(`${BASE_URL}/shifts/${testShiftId}`, {
      method: 'DELETE',
    });
    const dataDelete: any = await resDelete.json();

    if (resDelete.status === 200 && dataDelete.success === true) {
      report('TC-11: Xóa ca trực trống thành công', true);
    } else {
      report('TC-11: Xóa ca trực trống thất bại', false, JSON.stringify(dataDelete));
    }
  } catch (err: any) {
    report('TC-11: Xóa ca trực trống thất bại', false, err.message);
  }

  // Bước 12: Kiểm thử chặn xóa ca trực có lịch hẹn (TC-12)
  try {
    // 12.1 Tạo ca trực mới
    const resCreate = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dentistId: '1',
        workDate: dateStr,
        shiftType: 'Afternoon',
        roomId: 1,
      }),
    });
    const dataCreate: any = await resCreate.json();
    const activeShiftId = dataCreate.data.shiftId;

    // 12.2 Đặt lịch hẹn vào ca trực đó (Khung giờ Afternoon: 03:00 PM local = 08:00 AM UTC)
    const otpTokenActive = await getOtpToken(testPhone);
    const resAppt = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
        'x-otp-token': otpTokenActive
      },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        serviceId: '1',
        roomId: 1,
        startTime: `${dateStr}T08:00:00.000Z`,
      }),
    });
    const dataAppt: any = await resAppt.json();
    const activeApptId = dataAppt.data.appointmentId;

    // 12.3 Thử xóa ca trực
    const resDelete = await fetch(`${BASE_URL}/shifts/${activeShiftId}`, {
      method: 'DELETE',
    });
    const dataDelete: any = await resDelete.json();

    if (resDelete.status === 400 && dataDelete.error?.code === 'SHIFT_HAS_APPOINTMENTS') {
      report('TC-12: Chặn xóa ca trực có lịch hẹn thành công (Trả về HTTP 400 + SHIFT_HAS_APPOINTMENTS)', true);
    } else {
      report('TC-12: Chặn xóa ca trực có lịch hẹn thất bại', false, `HTTP Status: ${resDelete.status}, Data: ${JSON.stringify(dataDelete)}`);
    }

    // Dọn dẹp: Hủy lịch hẹn vừa tạo để tránh ảnh hưởng dữ liệu
    await fetch(`${BASE_URL}/appointments/${activeApptId}/cancel`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cancelReason: 'Dọn dẹp kiểm thử' }),
    });

    // Dọn dẹp: Xóa ca trực sau khi đã hủy lịch hẹn
    await fetch(`${BASE_URL}/shifts/${activeShiftId}`, {
      method: 'DELETE',
    });

  } catch (err: any) {
    report('TC-12: Chặn xóa ca trực có lịch hẹn thất bại', false, err.message);
  }

  // Bước 13: Kiểm thử đồng thời (Concurrency - TC-13)
  try {
    // 13.1 Tạo ca trực mới
    const resCreate = await fetch(`${BASE_URL}/shifts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dentistId: '1',
        workDate: dateStr,
        shiftType: 'Afternoon',
        roomId: 1,
      }),
    });
    const dataCreate: any = await resCreate.json();
    const tempShiftId = dataCreate.data.shiftId;

    // 13.2 Xóa ca trực trước (mô phỏng Admin xóa ca trực)
    const resDelete = await fetch(`${BASE_URL}/shifts/${tempShiftId}`, {
      method: 'DELETE',
    });

    // 13.3 Bệnh nhân cố đặt lịch vào ca trực đã xóa
    const otpTokenTemp = await getOtpToken(testPhone);
    const resAppt = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`,
        'x-otp-token': otpTokenTemp
      },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        serviceId: '1',
        roomId: 1,
        startTime: `${dateStr}T08:00:00.000Z`,
      }),
    });
    const dataAppt: any = await resAppt.json();

    if (resAppt.status === 409 && dataAppt.error?.code === 'SLOT_NOT_AVAILABLE') {
      report('TC-13: Kiểm thử đồng thời thành công (Chặn đặt lịch vào ca trực đã xóa, trả về HTTP 409 + SLOT_NOT_AVAILABLE)', true);
    } else {
      report('TC-13: Kiểm thử đồng thời thất bại', false, `HTTP Status: ${resAppt.status}, Data: ${JSON.stringify(dataAppt)}`);
    }

  } catch (err: any) {
    report('TC-13: Kiểm thử đồng thời thất bại', false, err.message);
  }

  log('\n========================================================');
  log(`📊 TỔNG KẾT THỬ NGHIỆM CA TRỰC: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
  log('========================================================');
  
  await redis.quit();
  process.exit(failCount > 0 ? 1 : 0);
}

runShiftTests();

