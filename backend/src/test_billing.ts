import { log } from 'console';

const BASE_URL = 'http://localhost:5000/api';

async function runBillingTests() {
  log('========================================================');
  log('🚀 BẮT ĐẦU CHẠY THỬ NGHIỆM BẰNG TIẾNG VIỆT - MODULE HÓA ĐƠN & THANH TOÁN');
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

  // Bước 1: Đăng ký một bệnh nhân mới tinh để thực hiện test
  const testPhone = `098${Math.floor(1000000 + Math.random() * 9000000)}`;
  let token = '';
  let patientId = '';

  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bệnh Nhân Test Billing',
        phone: testPhone,
        password: 'password123',
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data && data.data.token) {
      token = data.data.token;
      patientId = data.data.user.patientId;
      report(`TC-01: Đăng ký thành viên test thành công (SĐT: ${testPhone}, ID: ${patientId})`, true);
    } else {
      report('TC-01: Đăng ký thành viên test thất bại', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-01: Đăng ký thành viên test thất bại', false, err.message);
    return;
  }

  // Bước 2: Bác sĩ điều trị tạo bệnh án và sử dụng dịch vụ S-01 (Lấy cao răng: 300,000đ) và S-02 (Tẩy trắng răng: 2,500,000đ)
  // Tổng hóa đơn: 2,800,000đ. Do hạng Standard nên không được chiết khấu (0%). Net price = 2,800,000đ.
  let invoiceId = '';
  try {
    const res = await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        notes: 'Khám lâm sàng răng sâu và lấy cao răng vệ sinh răng miệng',
        performedServices: ['1', '2'], // ID dịch vụ trong DB tương ứng là 1 và 2 (lấy cao răng & tẩy trắng răng)
        teeth: []
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data && data.data.id) {
      report('TC-02: Tạo hồ sơ bệnh án thành công', true);
    } else {
      report('TC-02: Tạo hồ sơ bệnh án thành công', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-02: Tạo hồ sơ bệnh án thành công', false, err.message);
    return;
  }

  // Bước 3: Tìm kiếm hóa đơn tự động tạo của bệnh nhân
  try {
    const res = await fetch(`${BASE_URL}/invoices/patients/${patientId}/billing`);
    const data: any = await res.json();
    if (res.status === 200 && data.data && Array.isArray(data.data.invoices) && data.data.invoices.length > 0) {
      const invoice = data.data.invoices[0];
      invoiceId = invoice.invoiceId;
      
      const totalPrice = Number(invoice.totalPrice);
      const netPrice = Number(invoice.netPrice);
      const status = invoice.status;

      if (totalPrice === 2800000 && netPrice === 2800000 && status === 'Pending') {
        report(`TC-03: Tự động khởi tạo hóa đơn thành công (Hóa đơn ID: ${invoiceId}, Tiền: ₫${netPrice})`, true);
      } else {
        report('TC-03: Tự động khởi tạo hóa đơn thành công', false, `Dữ liệu sai: Tổng=${totalPrice}, Net=${netPrice}, Status=${status}`);
      }
    } else {
      report('TC-03: Tự động khởi tạo hóa đơn thành công', false, JSON.stringify(data));
      return;
    }
  } catch (err: any) {
    report('TC-03: Tự động khởi tạo hóa đơn thành công', false, err.message);
    return;
  }

  // Bước 4: Kiểm tra nạp tiền ví bệnh nhân (Recharge 3,000,000đ)
  try {
    const res = await fetch(`${BASE_URL}/invoices/patients/${patientId}/recharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 3000000,
      }),
    });
    const data: any = await res.json();
    if (res.status === 200 && Number(data.data.walletBalance) === 3000000) {
      report('TC-04: Nạp tiền ví bệnh nhân thành công (Số dư: ₫3,000,000)', true);
    } else {
      report('TC-04: Nạp tiền ví bệnh nhân thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-04: Nạp tiền ví bệnh nhân thành công', false, err.message);
  }

  // Bước 5: Thực hiện thanh toán hóa đơn bằng ví điện tử (Wallet: 2,800,000đ)
  try {
    const res = await fetch(`${BASE_URL}/invoices/${invoiceId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 2800000,
        method: 'Wallet',
      }),
    });
    const data: any = await res.json();
    if (res.status === 200) {
      const remaining = Number(data.data.remainingAmount);
      const paid = Number(data.data.paidAmount);
      const status = data.data.status;
      const points = Number(data.data.patient.loyaltyPoints);
      
      if (remaining === 0 && paid === 2800000 && status === 'Paid' && points === 1) {
        report('TC-05: Thanh toán hóa đơn bằng ví thành viên thành công (Số dư còn nợ: 0đ, Lượt khám tích lũy: 1)', true);
      } else {
        report('TC-05: Thanh toán hóa đơn bằng ví thành viên thành công', false, `Dữ liệu không khớp: Nợ=${remaining}, Đã trả=${paid}, Status=${status}, Lượt khám=${points}`);
      }
    } else {
      report('TC-05: Thanh toán hóa đơn bằng ví thành viên thành công', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-05: Thanh toán hóa đơn bằng ví thành viên thành công', false, err.message);
  }

  // Bước 6: Kiểm tra số dư ví bệnh nhân sau thanh toán (Còn 200,000đ) và lịch sử giao dịch ví
  try {
    const res = await fetch(`${BASE_URL}/invoices/patients/${patientId}/billing`);
    const data: any = await res.json();
    if (res.status === 200 && data.data) {
      const balance = Number(data.data.patient.walletBalance);
      const txs = data.data.walletTransactions;
      
      if (balance === 200000 && txs.length === 2) {
        // Có 2 giao dịch: 1 Recharge (3,000,000), 1 PaymentDeduct (2,800,000)
        report(`TC-06: Xác nhận số dư ví bệnh nhân khớp chuẩn (Ví: ₫${balance.toLocaleString()})`, true);
      } else {
        report('TC-06: Xác nhận số dư ví bệnh nhân khớp chuẩn', false, `Số dư=${balance}, Số GD=${txs.length}`);
      }
    } else {
      report('TC-06: Xác nhận số dư ví bệnh nhân khớp chuẩn', false, JSON.stringify(data));
    }
  } catch (err: any) {
    report('TC-06: Xác nhận số dư ví bệnh nhân khớp chuẩn', false, err.message);
  }

  // Bước 7: Kiểm thử nâng hạng thành viên (Upgrade Rank)
  // Lượt khám hiện tại: 1. Để lên Gold (>=3 lượt khám) cần thêm 2 lượt khám nữa.
  try {
    // 7.1 Nạp 13,000,000đ vào ví
    await fetch(`${BASE_URL}/invoices/patients/${patientId}/recharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 13000000 }),
    });

    // 7.2 Tạo hồ sơ bệnh án thứ 2 (Lượt khám 2) với dịch vụ Implant (Service ID 6: 15,000,000đ)
    await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        notes: 'Tiến hành trồng răng Implant hàm dưới',
        performedServices: ['6'],
        teeth: []
      }),
    });

    // 7.3 Tạo hồ sơ bệnh án thứ 3 (Lượt khám 3) với dịch vụ Khám tổng quát (Service ID 8: 100,000đ)
    // Sau khi lưu bệnh án này, hệ thống sẽ tự động nâng hạng bệnh nhân lên Gold.
    await fetch(`${BASE_URL}/medical-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patientId,
        dentistId: '1',
        notes: 'Khám kiểm tra định kỳ lần 3',
        performedServices: ['8'],
        teeth: []
      }),
    });

    // Lấy hóa đơn mới tạo của Implant (15,000,000)
    const billRes = await fetch(`${BASE_URL}/invoices/patients/${patientId}/billing`);
    const billData: any = await billRes.json();
    const newInvoice = billData.data.invoices.find((inv: any) => Number(inv.totalPrice) === 15000000);
    const newInvId = newInvoice.invoiceId;

    // 7.4 Thanh toán hóa đơn mới 13,000,000đ bằng ví (Wallet) - Sẽ chuyển hóa đơn thành PartiallyPaid
    const payRes = await fetch(`${BASE_URL}/invoices/${newInvId}/pay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 13000000,
        method: 'Wallet',
      }),
    });
    const payData: any = await payRes.json();
    
    const finalPoints = Number(payData.data.patient.loyaltyPoints);
    const finalTier = payData.data.patient.tier.name;

    if (finalPoints === 3 && finalTier === 'Gold') {
      report(`TC-07: Tự động nâng hạng thành viên lên GOLD thành công (Lượt khám tích lũy: ${finalPoints}, Hạng: ${finalTier})`, true);
    } else {
      report('TC-07: Tự động nâng hạng thành viên lên GOLD thành công', false, `Lượt khám: ${finalPoints}, Hạng: ${finalTier}`);
    }
  } catch (err: any) {
    report('TC-07: Tự động nâng hạng thành viên lên GOLD thành công', false, err.message);
  }

  log('\n========================================================');
  log(`📊 TỔNG KẾT THỬ NGHIỆM HÓA ĐƠN: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
  log('========================================================');
}

runBillingTests();
