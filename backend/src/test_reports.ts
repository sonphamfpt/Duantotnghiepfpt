const BASE_URL = 'http://localhost:5000/api';

async function runReportTests() {
  console.log('========================================================');
  console.log('📊 BẮT ĐẦU CHẠY THỬ NGHIỆM - MODULE BÁO CÁO THỐNG KÊ (REPORTS)');
  console.log('========================================================');

  try {
    // 0. Tạo dữ liệu mẫu live để báo cáo có số liệu sinh động
    console.log('⏳ Đang tạo dữ liệu khám bệnh & thanh toán mẫu...');
    
    const phone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    // Đăng ký bệnh nhân
    const resPatient = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName: 'Nguyễn Báo Cáo', phone, password: 'password123' })
    });
    const patientText = await resPatient.text();
    if (resPatient.status !== 201) {
      console.log('❌ Lỗi tại bước Đăng ký bệnh nhân:', resPatient.status, patientText);
      return;
    }
    const patientData = JSON.parse(patientText);
    const patientId = patientData.data.user.patientId;

    // Cho bệnh nhân check-in vào phòng khám
    const resCheckin = await fetch(`${BASE_URL}/queues/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId, dentistId: '1', serviceName: 'Nhổ răng khôn' })
    });
    const checkinText = await resCheckin.text();
    if (resCheckin.status !== 201 && resCheckin.status !== 200) {
      console.log('❌ Lỗi tại bước Check-in:', resCheckin.status, checkinText);
      return;
    }
    const checkinData = JSON.parse(checkinText);
    const ticketId = checkinData.data.ticketId;

    // Bác sĩ bắt đầu khám
    const resStart = await fetch(`${BASE_URL}/queues/${ticketId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'InChair' })
    });
    const startText = await resStart.text();
    if (resStart.status !== 200) {
      console.log('❌ Lỗi tại bước Bắt đầu khám:', resStart.status, startText);
      return;
    }

    // Bác sĩ hoàn thành khám và chỉ định dịch vụ (Nhổ răng khôn)
    const resMed = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        dentistId: '1',
        queueTicketId: ticketId,
        notes: 'Nhổ răng số 8 hàm dưới',
        performedServices: ['4'], // ID Nhổ răng khôn
        sessionType: 'independent',
        teeth: [{ toothNumber: 38, condition: 'decay', treatmentNote: 'Nhổ bỏ' }]
      })
    });
    const medText = await resMed.text();
    if (resMed.status !== 201 && resMed.status !== 200) {
      console.log('❌ Lỗi tại bước Lưu bệnh án:', resMed.status, medText);
      return;
    }

    // Lấy hóa đơn vừa sinh ra
    const resInvoices = await fetch(`${BASE_URL}/invoices`);
    const invoicesText = await resInvoices.text();
    if (resInvoices.status !== 200) {
      console.log('❌ Lỗi tại bước Lấy danh sách hóa đơn:', resInvoices.status, invoicesText);
      return;
    }
    const invoicesData = JSON.parse(invoicesText);
    const testInvoice = invoicesData.data.find((i: any) => i.patientId === `P-${patientId}`);
    if (!testInvoice) {
      console.log('❌ Không tìm thấy hóa đơn của bệnh nhân Nguyễn Báo Cáo');
      return;
    }
    const invoiceId = testInvoice.id.split('-')[1];

    // Tiến hành thanh toán hóa đơn
    const resPay = await fetch(`${BASE_URL}/invoices/${invoiceId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: testInvoice.netPrice, method: 'Cash' })
    });
    const payText = await resPay.text();
    if (resPay.status !== 200) {
      console.log('❌ Lỗi tại bước Thanh toán hóa đơn:', resPay.status, payText);
      return;
    }

    console.log('✔️  [SUCCESS] TC-00: Tạo dữ liệu mẫu khám bệnh & thanh toán thành công!');
    const res = await fetch(`${BASE_URL}/reports/dashboard`);
    const data: any = await res.json();

    if (res.status === 200 && data.success === true) {
      console.log('✔️  [SUCCESS] TC-01: Truy vấn API Báo cáo thành công!');
      console.log('\n--- 📈 TỔNG QUAN DOANH THU & NỢ ---');
      console.log(`💵 Tổng doanh thu thực tế đã thu: ₫${data.data.totalRevenue.toLocaleString()}`);
      console.log(`💳 Tổng công nợ chưa thu (Phải thu): ₫${data.data.totalReceivables.toLocaleString()}`);

      console.log('\n--- 🦷 CƠ CẤU DOANH THU THEO DỊCH VỤ ---');
      if (data.data.serviceBreakdown.length > 0) {
        data.data.serviceBreakdown.forEach((item: any) => {
          console.log(`👉 ${item.serviceName}: ₫${item.revenue.toLocaleString()} (Số lượng: ${item.quantity})`);
        });
      } else {
        console.log('⚠️  Chưa có dữ liệu dịch vụ.');
      }

      console.log('\n--- 🧑‍⚕️ HIỆU SUẤT BÁC SĨ NHA KHOA ---');
      if (data.data.dentistPerformance.length > 0) {
        data.data.dentistPerformance.forEach((item: any) => {
          console.log(`👨‍⚕️ ${item.dentistName} (${item.specialty}): ${item.treatmentsCount} ca điều trị | Doanh số: ₫${item.revenueGenerated.toLocaleString()}`);
        });
      } else {
        console.log('⚠️  Chưa có dữ liệu hiệu suất bác sĩ.');
      }

      console.log('\n--- 📅 TỶ LỆ TRẠNG THÁI LỊCH HẸN ---');
      if (data.data.appointmentsRatio.length > 0) {
        data.data.appointmentsRatio.forEach((item: any) => {
          console.log(`📌 Trạng thái [${item.status}]: ${item.count} lịch hẹn`);
        });
      } else {
        console.log('⚠️  Chưa có dữ liệu lịch hẹn.');
      }

      console.log('\n--- 📈 XU HƯỚNG DOANH THU HÀNG NGÀY ---');
      if (data.data.dailyTrend.length > 0) {
        data.data.dailyTrend.forEach((item: any) => {
          console.log(`📅 Ngày ${item.date}: ₫${item.revenue.toLocaleString()}`);
        });
      } else {
        console.log('⚠️  Chưa có dữ liệu xu hướng hàng ngày.');
      }

    } else {
      console.log('❌ [FAILED] TC-01: Truy vấn API Báo cáo thất bại');
      console.log('Chi tiết:', JSON.stringify(data));
    }
  } catch (err: any) {
    console.log('❌ [FAILED] TC-01: Lỗi kết nối API Báo cáo');
    console.log('Chi tiết:', err.message);
  }

  console.log('\n========================================================');
  console.log('🏁 KẾT THÚC CHẠY THỬ NGHIỆM');
  console.log('========================================================');
}

runReportTests();
