import http from 'http';
import app from './app';
import { socketManager } from './config/socket';
import { io as ioClient } from 'socket.io-client';
import { prisma } from './config/prisma';

const TEST_PORT = 5099;
const BASE_URL = `http://localhost:${TEST_PORT}/api`;
const WS_URL = `http://localhost:${TEST_PORT}`;

async function runWebSocketTests() {
  console.log('========================================================');
  console.log('🚀 BẮT ĐẦU CHẠY THỬ NGHIỆM LIÊN THÔNG - WEBSOCKET REAL-TIME');
  console.log('========================================================');

  // 1. Khởi động server phụ trên port TEST_PORT để chạy test độc lập
  const testServer = http.createServer(app);
  socketManager.init(testServer);

  await new Promise<void>((resolve) => {
    testServer.listen(TEST_PORT, () => {
      console.log(`ℹ️  Test Server đang chạy tại: ${WS_URL}`);
      resolve();
    });
  });

  let successCount = 0;
  let failCount = 0;

  function report(testName: string, passed: boolean, message?: string) {
    if (passed) {
      successCount++;
      console.log(`✔️  [SUCCESS] ${testName}`);
    } else {
      failCount++;
      console.log(`❌ [FAILED] ${testName}`);
      if (message) console.log(`   ↳ Chi tiết: ${message}`);
    }
  }

  // 2. Khởi tạo WebSocket Client kết nối đến Test Server
  const clientSocket = ioClient(WS_URL, {
    transports: ['websocket'],
    autoConnect: false,
  });

  clientSocket.connect();

  // Đợi kết nối thành công
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket client connection timeout')), 5000);
    clientSocket.on('connect', () => {
      clearTimeout(timer);
      report('TC-01: Kết nối thành công đến WebSocket server', true);
      resolve();
    });
    clientSocket.on('connect_error', (err) => {
      clearTimeout(timer);
      report('TC-01: Kết nối thành công đến WebSocket server', false, err.message);
      reject(err);
    });
  });

  // Thiết lập lưu trữ sự kiện nhận được để kiểm tra
  const receivedEvents: Array<{ event: string; payload: any }> = [];
  
  clientSocket.on('queue:checkin', (payload) => {
    receivedEvents.push({ event: 'queue:checkin', payload });
  });

  clientSocket.on('queue:status_changed', (payload) => {
    receivedEvents.push({ event: 'queue:status_changed', payload });
  });

  clientSocket.on('invoice:paid', (payload) => {
    receivedEvents.push({ event: 'invoice:paid', payload });
  });

  // 3. Đăng ký một bệnh nhân test
  const testPhone = `098${Math.floor(1000000 + Math.random() * 9000000)}`;
  let patientId = '';
  
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Bệnh Nhân Test WS',
        phone: testPhone,
        password: 'password123',
      }),
    });
    const data: any = await res.json();
    if (res.status === 201 && data.data) {
      patientId = data.data.user.patientId;
      report(`TC-02: Đăng ký thành viên kiểm thử thành công (ID: ${patientId})`, true);
    } else {
      report('TC-02: Đăng ký thành viên kiểm thử thành công', false, JSON.stringify(data));
      cleanup(testServer, clientSocket);
      return;
    }
  } catch (err: any) {
    report('TC-02: Đăng ký thành viên kiểm thử thành công', false, err.message);
    cleanup(testServer, clientSocket);
    return;
  }

  // Lấy dentist mẫu từ DB
  const dentist = await prisma.dentist.findFirst();
  if (!dentist) {
    report('Lỗi chuẩn bị test', false, 'Không tìm thấy bác sĩ nào trong cơ sở dữ liệu. Vui lòng seed trước.');
    cleanup(testServer, clientSocket);
    return;
  }
  const dentistId = String(dentist.dentistId);

  // 4. Test Check-in Bệnh nhân & Đón nhận event `queue:checkin`
  let ticketId = '';
  try {
    const checkinRes = await fetch(`${BASE_URL}/queues/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        dentistId,
      }),
    });
    const checkinData: any = await checkinRes.json();
    
    if (checkinRes.status === 201 && checkinData.data) {
      ticketId = checkinData.data.id;
      report('TC-03: Gửi HTTP Request Check-in bệnh nhân thành công', true);
    } else {
      report('TC-03: Gửi HTTP Request Check-in bệnh nhân thành công', false, JSON.stringify(checkinData));
    }

    // Đợi nhận được event WebSocket
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    
    const checkinEvent = receivedEvents.find(e => e.event === 'queue:checkin');
    if (checkinEvent) {
      const payload = checkinEvent.payload;
      if (payload.event === 'queue:checkin' && payload.data.patientName === 'Bệnh Nhân Test WS') {
        report('TC-04: Nhận sự kiện WebSocket [queue:checkin] tức thì với dữ liệu chuẩn xác', true);
      } else {
        report('TC-04: Nhận sự kiện WebSocket [queue:checkin] tức thì', false, `Dữ liệu không khớp: ${JSON.stringify(payload)}`);
      }
    } else {
      report('TC-04: Nhận sự kiện WebSocket [queue:checkin] tức thì', false, 'Không nhận được sự kiện nào sau 1 giây.');
    }
  } catch (err: any) {
    report('TC-03/04: Lỗi quy trình check-in', false, err.message);
  }

  // 5. Test Cập nhật trạng thái khám (InChair) & Đón nhận event `queue:status_changed`
  try {
    const statusRes = await fetch(`${BASE_URL}/queues/${ticketId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'InChair',
      }),
    });
    const statusData: any = await statusRes.json();
    
    if (statusRes.status === 200 && statusData.success) {
      report('TC-05: Gửi HTTP Request chuyển trạng thái sang [In Chair] thành công', true);
    } else {
      report('TC-05: Gửi HTTP Request chuyển trạng thái sang [In Chair] thành công', false, JSON.stringify(statusData));
    }

    // Đợi nhận được event WebSocket
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    
    const statusEvent = receivedEvents.find(e => e.event === 'queue:status_changed');
    if (statusEvent) {
      const payload = statusEvent.payload;
      if (payload.event === 'queue:status_changed' && payload.data.newStatus === 'InChair') {
        report('TC-06: Nhận sự kiện WebSocket [queue:status_changed] tức thì với trạng thái [InChair]', true);
      } else {
        report('TC-06: Nhận sự kiện WebSocket [queue:status_changed] tức thì', false, `Dữ liệu không khớp: ${JSON.stringify(payload)}`);
      }
    } else {
      report('TC-06: Nhận sự kiện WebSocket [queue:status_changed] tức thì', false, 'Không nhận được sự kiện nào sau 1 giây.');
    }
  } catch (err: any) {
    report('TC-05/06: Lỗi quy trình cập nhật trạng thái', false, err.message);
  }

  // 6. Tổng kết và kết thúc test
  console.log('========================================================');
  console.log(`📊 TỔNG KẾT: THÀNH CÔNG: ${successCount} | THẤT BẠI: ${failCount}`);
  console.log('========================================================');

  cleanup(testServer, clientSocket);
}

function cleanup(server: http.Server, socket: any) {
  console.log('🔌 Đang dọn dẹp tài nguyên kiểm thử...');
  socket.disconnect();
  socketManager.close();
  server.close(() => {
    console.log('👋 Đã đóng Test Server.');
    prisma.$disconnect().then(() => {
      process.exit(0);
    });
  });
}

// Chạy test script
runWebSocketTests().catch((err) => {
  console.error('❌ Lỗi không xác định khi chạy test:', err);
  process.exit(1);
});
