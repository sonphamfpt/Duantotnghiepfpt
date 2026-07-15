import { log } from 'console';
import { redis } from './config/redis';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  log('========================================================');
  log('🚀 BẮT ĐẦU CHẠY THỬ NGHIỆM TỰ ĐỘNG - QC AGENT REPORT');
  log('========================================================');

  let successCount = 0;
  let failCount = 0;

  function reportResult(testName: string, passed: boolean, message?: string) {
    if (passed) {
      successCount++;
      log(`✔️  [SUCCESS] ${testName}`);
    } else {
      failCount++;
      log(`❌ [FAILED] ${testName}`);
      if (message) log(`   ↳ Chi tiết: ${message}`);
    }
  }

  // Khởi tạo ngày hôm nay và ngày mai động để khớp với Shifts được seed trong DB
  const todayDate = new Date();
  const todayStr = todayDate.toISOString().split('T')[0];
  
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

  log(`ℹ️  Ngày hôm nay: ${todayStr} | Ngày mai: ${tomorrowStr}`);

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

  // 1. TEST SUITE: AUTHENTICATION
  log('\n🔑 1. KIỂM THỬ XÁC THỰC (AUTH)...');
  
  // TC-01: Đăng nhập Lễ tân mẫu thành công
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '0901234567', // đổi từ username sang identifier
        password: '12345678',
      }),
    });
    const data: any = await res.json();
    if (res.ok && data.data && data.data.token) {
      reportResult('TC-01: Đăng nhập Lễ tân mẫu thành công', true);
    } else {
      reportResult('TC-01: Đăng nhập Lễ tân mẫu thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-01: Đăng nhập Lễ tân mẫu thành công', false, err.message);
  }

  // TC-02: Đăng nhập thất bại (Sai mật khẩu)
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: '0901234567',
        password: 'wrong_password',
      }),
    });
    const data: any = await res.json();
    if (res.status === 401 && data.error && data.error.code === 'INVALID_CREDENTIALS') {
      reportResult('TC-02: Đăng nhập thất bại với sai mật khẩu', true);
    } else {
      reportResult('TC-02: Đăng nhập thất bại với sai mật khẩu', false, `Status: ${res.status}, ErrorCode: ${data.error ? data.error.code : 'undefined'}`);
    }
  } catch (err: any) {
    reportResult('TC-02: Đăng nhập thất bại với sai mật khẩu', false, err.message);
  }

  // TC-03: Đăng ký bệnh nhân mới
  const testPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  let registeredToken = '';
  let registeredPatientId = '';
  try {
    const otpToken = await getOtpToken(testPhone);
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bệnh Nhân Test QC Tự Động',
        phone: testPhone,
        password: 'password123',
        otpToken,
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data && data.data.token) {
      registeredToken = data.data.token;
      registeredPatientId = data.data.user.patientId; // Dùng patientId thay vì userId
      reportResult(`TC-03: Đăng ký Bệnh nhân mới thành công (SĐT: ${testPhone})`, true);
    } else {
      reportResult('TC-03: Đăng ký Bệnh nhân mới thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-03: Đăng ký Bệnh nhân mới thành công', false, err.message);
  }

  // 2. TEST SUITE: BOOKING
  log('\n📅 2. KIỂM THỬ ĐẶT LỊCH HẸN (BOOKING)...');

  // Lấy slot trống ngày mai (tomorrowStr) để test đặt lịch
  let sampleSlot = '';
  try {
    const res = await fetch(`${BASE_URL}/appointments/dentists/D-01/available-slots?date=${tomorrowStr}&serviceId=S-02`);
    const data: any = await res.json();
    if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
      sampleSlot = data.data[0]; // lấy slot đầu tiên khả dụng
      reportResult(`TC-00: Lấy thành công ca trực & slot trống mẫu (${sampleSlot})`, true);
    } else {
      reportResult('TC-00: Lấy thành công ca trực & slot trống mẫu', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-00: Lấy thành công ca trực & slot trống mẫu', false, err.message);
  }

  if (!sampleSlot) {
    log('⚠️ Bỏ qua các test case đặt lịch do không lấy được slot trống khả dụng của ngày mai.');
    log(`========================================================`);
    log(`📊 TỔNG KẾT: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
    log(`========================================================`);
    return;
  }

  // TC-04: Đặt lịch khám vãng lai (Guest Booking)
  const guestPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  try {
    const otpToken = await getOtpToken(guestPhone);
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-otp-token': otpToken
      },
      body: JSON.stringify({
        fullName: 'Khách vãng lai QC',
        phone: guestPhone,
        patientName: 'Khách vãng lai QC',
        patientPhone: guestPhone,
        dentistId: 'D-01',
        serviceId: 'S-02',
        startTime: sampleSlot,
        bookingChannel: 'Online',
        patientNotes: 'Test vãng lai',
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.message.includes('thành công')) {
      reportResult('TC-04: Đặt lịch khám vãng lai thành công', true);
    } else {
      reportResult('TC-04: Đặt lịch khám vãng lai thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-04: Đặt lịch khám vãng lai thành công', false, err.message);
  }

  // TC-07: Chặn đặt trùng lịch thành công (Overlap Protection)
  try {
    const overlapPhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
    const otpToken = await getOtpToken(overlapPhone);
    const res = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-otp-token': otpToken
      },
      body: JSON.stringify({
        patientName: 'Khách vãng lai QC trùng',
        patientPhone: overlapPhone,
        dentistId: 'D-01',
        serviceId: 'S-02',
        startTime: sampleSlot,
        bookingChannel: 'Online',
      }),
    });
    const data: any = await res.json();
    if (res.status === 409 && data.error && (data.error.code === 'APPOINTMENT_OVERLAP' || data.error.code === 'SLOT_NOT_AVAILABLE')) {
      reportResult('TC-07: Chặn đặt trùng lịch thành công (Overlap Rejection)', true);
    } else {
      reportResult('TC-07: Chặn đặt trùng lịch thành công', false, `Status: ${res.status}, Code: ${data.error ? data.error.code : 'undefined'}, Msg: ${data.error ? data.error.message : 'undefined'}`);
    }
  } catch (err: any) {
    reportResult('TC-07: Chặn đặt trùng lịch thành công', false, err.message);
  }

  // TC-05: Đặt lịch khám với bệnh nhân đã đăng nhập
  // Lấy một slot khác của ngày hôm nay (todayStr) để tránh trùng lịch
  let anotherSlot = '';
  try {
    const res = await fetch(`${BASE_URL}/appointments/dentists/D-01/available-slots?date=${todayStr}&serviceId=S-02`);
    const data: any = await res.json();
    if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
      anotherSlot = data.data[0];
    }
  } catch {}

  if (anotherSlot && registeredToken && registeredPatientId) {
    try {
      const otpToken = await getOtpToken(testPhone);
      const res = await fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${registeredToken}`,
          'x-otp-token': otpToken
        },
        body: JSON.stringify({
          patientId: registeredPatientId.toString(),
          dentistId: 'D-01',
          serviceId: 'S-02',
          startTime: anotherSlot,
          bookingChannel: 'Online',
        }),
      });
      const data: any = await res.json();
      if (res.status === 201) {
        reportResult('TC-05: Bệnh nhân đăng nhập đặt lịch thành công', true);
      } else {
        reportResult('TC-05: Bệnh nhân đăng nhập đặt lịch thành công', false, JSON.stringify(data));
      }
    } catch (err: any) {
      reportResult('TC-05: Bệnh nhân đăng nhập đặt lịch thành công', false, err.message);
    }
  } else {
    log('⚠️ Bỏ qua TC-05 do thiếu tài khoản hoặc slot khám khả dụng ngày hôm nay.');
  }

  // 3. TEST SUITE: QUEUES (HÀNG CHỜ)
  log('\n🚶 3. KIỂM THỬ HÀNG CHỜ (QUEUES)...');
  let sampleQueueId = '';
  try {
    const res = await fetch(`${BASE_URL}/queues/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: registeredPatientId || '1',
        dentistId: 'D-01',
        serviceId: 'S-02',
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data && data.data.id) {
      sampleQueueId = data.data.id;
      reportResult('TC-08: Tiếp đón bệnh nhân vào hàng chờ thành công', true);
    } else {
      reportResult('TC-08: Tiếp đón bệnh nhân vào hàng chờ thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-08: Tiếp đón bệnh nhân vào hàng chờ thành công', false, err.message);
  }

  if (sampleQueueId) {
    // TC-09: Cập nhật trạng thái hàng chờ sang Đang điều trị (In Chair)
    try {
      const res = await fetch(`${BASE_URL}/queues/${sampleQueueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'InChair',
        }),
      });
      const data: any = await res.json();
      if (res.status === 200 && data.data && data.data.status === 'In Chair') {
        reportResult('TC-09: Chuyển trạng thái sang Đang điều trị thành công', true);
      } else {
        reportResult('TC-09: Chuyển trạng thái sang Đang điều trị thành công', false, JSON.stringify(data));
      }
    } catch (err: any) {
      reportResult('TC-09: Chuyển trạng thái sang Đang điều trị thành công', false, err.message);
    }

    // TC-10: Cập nhật trạng thái hàng chờ sang Hoàn thành (Completed)
    try {
      const res = await fetch(`${BASE_URL}/queues/${sampleQueueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
        }),
      });
      const data: any = await res.json();
      if (res.status === 200 && data.data && data.data.status === 'Completed') {
        reportResult('TC-10: Chuyển trạng thái sang Hoàn thành thành công', true);
      } else {
        reportResult('TC-10: Chuyển trạng thái sang Hoàn thành thành công', false, JSON.stringify(data));
      }
    } catch (err: any) {
      reportResult('TC-10: Chuyển trạng thái sang Hoàn thành thành công', false, err.message);
    }
  } else {
    log('⚠️ Bỏ qua TC-09 và TC-10 do không tạo được hàng chờ mẫu.');
  }

  // 4. TEST SUITE: MEDICAL RECORDS (HỒ SƠ BỆNH ÁN)
  log('\n🦷 4. KIỂM THỬ HỒ SƠ BỆNH ÁN (MEDICAL RECORDS)...');
  try {
    const res = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: registeredPatientId || '1',
        dentistId: 'D-01',
        notes: 'Chẩn đoán: Sâu răng hàm mặt | Đơn thuốc: Paracetamol (10 viên) - Ngày uống 2 lần',
        performedServices: ['S-01'],
        teeth: [
          { toothNumber: 16, condition: 'decay', treatmentNote: 'Sâu men răng mặt nhai' }
        ]
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data && data.data.id) {
      reportResult('TC-11: Khởi tạo hồ sơ bệnh án thành công', true);
    } else {
      reportResult('TC-11: Khởi tạo hồ sơ bệnh án thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-11: Khởi tạo hồ sơ bệnh án thành công', false, err.message);
  }

  try {
    const res = await fetch(`${BASE_URL}/medical-records/patients/${registeredPatientId || '1'}`);
    const data: any = await res.json();
    if (res.status === 200 && Array.isArray(data.data) && data.data.length > 0) {
      const match = data.data[0];
      if (match.teethMap && match.teethMap.some((t: any) => t.toothNumber === 16 && t.condition === 'decay')) {
        reportResult('TC-12: Lấy danh sách bệnh án điện tử và kiểm chứng sơ đồ răng thành công', true);
      } else {
        reportResult('TC-12: Lấy danh sách bệnh án điện tử và kiểm chứng sơ đồ răng thành công', false, `teethMap mismatch: ${JSON.stringify(match.teethMap)}`);
      }
    } else {
      reportResult('TC-12: Lấy danh sách bệnh án điện tử và kiểm chứng sơ đồ răng thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-12: Lấy danh sách bệnh án điện tử và kiểm chứng sơ đồ răng thành công', false, err.message);
  }

  // 5. TEST SUITE: RECEPTIONIST APPOINTMENTS (LỊCH HẸN LỄ TÂN)
  log('\n📋 5. KIỂM THỬ LỊCH HẸN LỄ TÂN (RECEPTIONIST APPOINTMENTS)...');
  try {
    const res = await fetch(`${BASE_URL}/appointments`);
    const data: any = await res.json();
    if (res.status === 200 && Array.isArray(data.data) && data.data.length > 0) {
      const match = data.data.find((a: any) => a.patientName === 'Trần Nguyễn Minh');
      if (match && match.id && match.time) {
        reportResult('TC-13: Lấy danh sách toàn bộ lịch hẹn và đồng bộ hóa thành công', true);
      } else {
        reportResult('TC-13: Lấy danh sách toàn bộ lịch hẹn và đồng bộ hóa thành công', false, `Minh appointment not found or mismatched: ${JSON.stringify(data.data)}`);
      }
    } else {
      reportResult('TC-13: Lấy danh sách toàn bộ lịch hẹn và đồng bộ hóa thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    reportResult('TC-13: Lấy danh sách toàn bộ lịch hẹn và đồng bộ hóa thành công', false, err.message);
  }

  // 6. TEST SUITE: PATIENT PROFILE LINKAGE (LIÊN KẾT BỆNH ÁN CŨ CHO TÀI KHOẢN MỚI)
  log('\n🔑 6. KIỂM THỬ LIÊN KẾT BỆNH ÁN CŨ KHI TẠO TÀI KHOẢN (PATIENT LINKAGE)...');
  const linkagePhone = `09${Math.floor(10000000 + Math.random() * 90000000)}`;
  try {
    // Truy vấn slot trống thực tế của D-02 để đảm bảo ca trực khả dụng
    let linkageSlot = '';
    const slotsRes = await fetch(`${BASE_URL}/appointments/dentists/D-02/available-slots?date=${tomorrowStr}&serviceId=S-01`);
    const slotsData: any = await slotsRes.json();
    if (slotsRes.ok && Array.isArray(slotsData.data) && slotsData.data.length > 0) {
      linkageSlot = slotsData.data[0];
    }
    if (!linkageSlot) {
      throw new Error('Không tìm thấy slot trống khả dụng cho D-02 ngày mai.');
    }

    // Bước A: Tạo lịch hẹn và tự động tạo bệnh nhân vãng lai mới (dùng bác sĩ D-02 tránh trùng slot)
    const bookingRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Bệnh Nhân Vãng Lai Cũ',
        patientPhone: linkagePhone,
        dentistId: 'D-02',
        serviceId: 'S-01',
        startTime: linkageSlot,
        bookingChannel: 'WalkIn',
      }),
    });
    const bookingData: any = await bookingRes.json();
    const guestPatientId = bookingData.data?.patientId;

    if (bookingRes.status === 201 && guestPatientId) {
      // Bước B: Bác sĩ điều trị cho bệnh nhân vãng lai này để sinh ra bệnh án điện tử (Medical Record)
      const mrRes = await fetch(`${BASE_URL}/medical-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: guestPatientId.toString(),
          dentistId: '1',
          notes: 'Răng sâu độ 2 — Hàn răng composite thẩm mỹ',
          teeth: [
            { toothNumber: 14, condition: 'decay', treatmentNote: 'Hàn composite' }
          ],
          performedServices: ['2']
        })
      });
      const mrData: any = await mrRes.json();
      if (mrRes.status !== 201) {
        reportResult('TC-14: Bệnh nhân tạo tài khoản mới thấy được bệnh án khám vãng lai cũ thành công', false, `Medical record creation failed: ${JSON.stringify(mrData)}`);
      } else {

      // Bước C: Đăng ký tài khoản mới bằng số điện thoại đó (yêu cầu OTP)
      const regOtpToken = await getOtpToken(linkagePhone);
      const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Bệnh Nhân Vãng Lai Cũ',
          phone: linkagePhone,
          password: 'Password123',
          otpToken: regOtpToken,
        }),
      });
      const regData: any = await regRes.json();
      const newPatientId = regData.data?.user?.patientId;
      const newToken = regData.data?.token;

      if (regRes.status === 201 && newPatientId === guestPatientId.toString() && newToken) {
        // Bước D: Gọi API lấy bệnh án với tư cách bệnh nhân mới đăng nhập
        const recordsRes = await fetch(`${BASE_URL}/medical-records/patients/${newPatientId}`, {
          headers: { 'Authorization': `Bearer ${newToken}` }
        });
        const recordsData: any = await recordsRes.json();

        if (recordsRes.status === 200 && Array.isArray(recordsData.data) && recordsData.data.length > 0) {
          reportResult('TC-14: Bệnh nhân tạo tài khoản mới thấy được bệnh án khám vãng lai cũ thành công', true);
        } else {
          reportResult('TC-14: Bệnh nhân tạo tài khoản mới thấy được bệnh án khám vãng lai cũ thành công', false, `Records empty or fetch failed: ${JSON.stringify(recordsData)}`);
        }
      } else {
        reportResult('TC-14: Bệnh nhân tạo tài khoản mới thấy được bệnh án khám vãng lai cũ thành công', false, `Registration failed: Status ${regRes.status}, patientId matched? ${newPatientId === guestPatientId.toString()}`);
      }
      } // end medical record else
    } else {
      reportResult('TC-14: Bệnh nhân tạo tài khoản mới thấy được bệnh án khám vãng lai cũ thành công', false, `Walk-in booking failed: ${JSON.stringify(bookingData)}`);
    }
  } catch (err: any) {
    reportResult('TC-14: Bệnh nhân tạo tài khoản mới thấy được bệnh án khám vãng lai cũ thành công', false, err.message);
  }

  log('\n========================================================');
  log(`📊 TỔNG KẾT: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
  log('========================================================');
  await redis.quit();
}

runTests();
