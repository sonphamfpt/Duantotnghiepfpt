import { ClinicLog } from '../types/clinic';

export const INITIAL_LOGS: ClinicLog[] = [
  { id: 'L-01', time: '12:30:14', module: 'AUTH', type: 'INFO', message: 'Bác sĩ Nguyễn Hương đăng nhập vào hệ thống thành công qua cổng OAuth2.' },
  { id: 'L-02', time: '12:34:02', module: 'CASHIER', type: 'SUCCESS', message: 'Giao dịch thành công: Hóa đơn #INV-9213 đã được thanh toán qua ZaloPay.' },
  { id: 'L-03', time: '12:35:10', module: 'SYSTEM', type: 'WARN', message: 'Cảnh báo: Hàng chờ tại Quầy lễ tân phát sinh tải lượng cao (> 5 bệnh nhân đang chờ).' },
  { id: 'L-04', time: '12:38:45', module: 'SYSTEM', type: 'INFO', message: 'Sao lưu dữ liệu hồ sơ bệnh án tự động hoàn tất. Tình trạng DB: Khỏe mạnh.' },
  { id: 'L-05', time: '12:40:01', module: 'RECEPTION', type: 'INFO', message: 'Đăng ký bệnh nhân mới thành công: ID-29402 - Đặng Minh Khoa.' },
  { id: 'L-06', time: '12:41:22', module: 'SYSTEM', type: 'ERR', message: 'Lỗi Timeout kết nối dịch vụ SMS Gateway (không gửi được tin nhắc hẹn).' },
  { id: 'L-07', time: '12:42:00', module: 'SYSTEM', type: 'SUCCESS', message: 'Tự động phục hồi kết nối dịch vụ SMS Gateway thành công. Đã gửi bù 3 tin nhắn.' }
];
