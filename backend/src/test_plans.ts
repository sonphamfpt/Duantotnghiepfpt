import { log } from 'console';

const BASE_URL = 'http://localhost:5000/api';

async function runPlanTests() {
  log('========================================================');
  log('🚀 BẮT ĐẦU CHẠY THỬ NGHIỆM - MODULE PHÁC ĐỒ ĐIỀU TRỊ (TREATMENT PLANS)');
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

  // Bước 1: Đăng ký một bệnh nhân mới
  const testPhone = `099${Math.floor(1000000 + Math.random() * 9000000)}`;
  let patientId = '';

  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bệnh Nhân Test Phác Đồ',
        phone: testPhone,
        password: 'password123',
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      patientId = data.data.user.patientId;
      report(`TC-01: Đăng ký thành viên test thành công (ID: ${patientId})`, true);
    } else {
      report('TC-01: Đăng ký thành viên test thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-01: Đăng ký thành viên test thất bại', false, err.message);
    return;
  }

  // Bước 2: Bác sĩ điều trị chọn "Khởi tạo phác đồ" (plan_init)
  // Thực hiện dịch vụ Lấy cao răng (ID: 1: 300,000đ) và Tẩy trắng răng (ID: 2: 2,500,000đ)
  // Mong đợi: Hệ thống tự động tạo 1 Phác đồ điều trị và 1 hóa đơn tổng (2,800,000đ)
  let planId = '';
  try {
    const res = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        notes: 'Khởi tạo phác đồ bọc răng sứ thẩm mỹ dài hạn',
        sessionType: 'plan_init',
        performedServices: ['1', '2'],
        teeth: []
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      report('TC-02: Bác sĩ tạo hồ sơ bệnh án khởi tạo phác đồ (plan_init) thành công', true);
    } else {
      report('TC-02: Bác sĩ tạo hồ sơ bệnh án khởi tạo phác đồ (plan_init) thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-02: Bác sĩ tạo hồ sơ bệnh án khởi tạo phác đồ (plan_init) thất bại', false, err.message);
    return;
  }

  // Bước 3: Lấy danh sách phác đồ điều trị của bệnh nhân để kiểm tra việc tự động khởi tạo
  try {
    const res = await fetch(`${BASE_URL}/treatment-plans/patients/${patientId}`);
    const data: any = await res.json();
    if (res.status === 200 && Array.isArray(data.data) && data.data.length > 0) {
      const plan = data.data[0];
      planId = plan.planId;
      const title = plan.title;
      const cost = Number(plan.estimatedTotalCost);
      const status = plan.status;

      if (title.includes('Lấy cao răng') && cost === 2800000 && status === 'Active') {
        report(`TC-03: Tự động khởi tạo Phác đồ thành công (Phác đồ ID: ${planId}, Tiêu đề: "${title}", Dự tính: ₫${cost.toLocaleString()})`, true);
      } else {
        report('TC-03: Tự động khởi tạo Phác đồ thành công', false, `Dữ liệu sai: Tiêu đề=${title}, Giá=${cost}, Status=${status}`);
      }
    } else {
      report('TC-03: Tự động khởi tạo Phác đồ thành công', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-03: Tự động khởi tạo Phác đồ thành công', false, err.message);
    return;
  }

  // Bước 4: Kiểm tra hóa đơn của đợt khởi tạo (Tổng 2,800,000đ)
  try {
    const res = await fetch(`${BASE_URL}/invoices/patients/${patientId}/billing`);
    const data: any = await res.json();
    if (res.status === 200 && data.data && data.data.invoices.length === 1) {
      const price = Number(data.data.invoices[0].netPrice);
      if (price === 2800000) {
        report('TC-04: Hóa đơn tổng 2.8M được sinh ra cho buổi khởi tạo đầu tiên', true);
      } else {
        report('TC-04: Hóa đơn tổng 2.8M được sinh ra cho buổi khởi tạo đầu tiên', false, `Giá trị hóa đơn: ${price}`);
      }
    } else {
      report('TC-04: Hóa đơn tổng 2.8M được sinh ra cho buổi khởi tạo đầu tiên', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-04: Hóa đơn tổng 2.8M được sinh ra cho buổi khởi tạo đầu tiên', false, err.message);
  }

  // Bước 5: Bác sĩ điều trị buổi tiếp theo thuộc phác đồ (plan_session)
  // Thực hiện dịch vụ Trám răng (ID: 3: 450,000đ) liên kết với Phác đồ ID đã có
  // Mong đợi: Tạo bệnh án thành công nhưng KHÔNG sinh thêm bất kỳ hóa đơn mới nào
  try {
    const res = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        notes: 'Phiên điều trị tiếp theo của phác đồ - Tiến hành hàn trám răng sâu',
        sessionType: 'plan_session',
        treatmentPlanId: planId,
        performedServices: ['3'],
        teeth: []
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      report('TC-05: Tạo phiên điều trị tiếp theo (plan_session) thành công', true);
    } else {
      report('TC-05: Tạo phiên điều trị tiếp theo (plan_session) thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-05: Tạo phiên điều trị tiếp theo (plan_session) thành công', false, err.message);
  }

  // Bước 6: Xác nhận KHÔNG có hóa đơn mới nào được tạo ở phiên điều trị thứ 2
  try {
    const res = await fetch(`${BASE_URL}/invoices/patients/${patientId}/billing`);
    const data: any = await res.json();
    if (res.status === 200 && data.data) {
      const invoiceCount = data.data.invoices.length;
      if (invoiceCount === 1) {
        report('TC-06: Xác nhận không phát sinh hóa đơn mới cho phiên điều trị tiếp theo chuẩn xác', true);
      } else {
        report('TC-06: Xác nhận không phát sinh hóa đơn mới cho phiên điều trị tiếp theo chuẩn xác', false, `Số lượng hóa đơn: ${invoiceCount}`);
      }
    } else {
      report('TC-06: Lấy thông tin hóa đơn lỗi', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-06: Lấy thông tin hóa đơn lỗi', false, err.message);
  }

  // Bước 7: Kiểm tra liên kết nhiều bệnh án trong phác đồ
  try {
    const res = await fetch(`${BASE_URL}/treatment-plans/${planId}`);
    const data: any = await res.json();
    if (res.status === 200 && data.data && Array.isArray(data.data.medicalRecords)) {
      const recordsCount = data.data.medicalRecords.length;
      if (recordsCount === 2) {
        report(`TC-07: Phác đồ đã liên kết thành công cả 2 phiên khám lâm sàng (Số lượng: ${recordsCount})`, true);
      } else {
        report('TC-07: Phác đồ liên kết bệnh án thất bại', false, `Số bệnh án: ${recordsCount}`);
      }
    } else {
      report('TC-07: Phác đồ liên kết bệnh án thất bại', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-07: Phác đồ liên kết bệnh án thất bại', false, err.message);
  }

  // Bước 8: Đổi trạng thái phác đồ sang hoàn thành (Completed)
  try {
    const res = await fetch(`${BASE_URL}/treatment-plans/${planId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'Completed',
      }),
    });
    const data: any = await res.json();
    if (res.status === 200 && data.data.status === 'Completed') {
      report('TC-08: Chuyển trạng thái phác đồ sang hoàn thành (Completed) thành công', true);
    } else {
      report('TC-08: Chuyển trạng thái phác đồ sang hoàn thành thất bại', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-08: Chuyển trạng thái phác đồ sang hoàn thành thất bại', false, err.message);
  }

  log('\n========================================================');
  log(`📊 TỔNG KẾT THỬ NGHIỆM PHÁC ĐỒ: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
  log('========================================================');
}

runPlanTests();
