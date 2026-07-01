import { Service, Dentist, Patient, Appointment, QueueItem, Invoice, ClinicLog, MedicalRecord, DoctorShift, ShiftChangeNotification } from '../types/clinic';

export const INITIAL_SERVICES: Service[] = [
  { id: 'S-01', name: 'Lấy cao răng & Vệ sinh', price: 300000, durationMin: 15, isActive: true },
  { id: 'S-02', name: 'Tẩy trắng răng thẩm mỹ', price: 2500000, durationMin: 45, isActive: true },
  { id: 'S-03', name: 'Trám răng thẩm mỹ (x1)', price: 450000, durationMin: 30, isActive: true },
  { id: 'S-04', name: 'Nhổ răng khôn thường', price: 1750000, durationMin: 45, isActive: true },
  { id: 'S-05', name: 'Điều trị tủy răng', price: 1200000, durationMin: 60, isActive: true },
  { id: 'S-06', name: 'Trồng răng Implant xương', price: 15000000, durationMin: 60, isActive: true },
  { id: 'S-07', name: 'Niềng răng/Chỉnh nha', price: 30000000, durationMin: 45, isActive: true },
  { id: 'S-08', name: 'Khám tổng quát & Tư vấn', price: 100000, durationMin: 15, isActive: true },
  { id: 'S-09', name: 'Bọc răng sứ toàn sứ', price: 5000000, durationMin: 60, isActive: true },
  { id: 'S-10', name: 'Gắn đá nha khoa', price: 500000, durationMin: 15, isActive: true },
  { id: 'S-11', name: 'Tiểu phẫu cắt chóp', price: 3000000, durationMin: 45, isActive: true },
  { id: 'S-12', name: 'Chụp X-quang răng', price: 150000, durationMin: 15, isActive: true }
];

export const INITIAL_DENTISTS: Dentist[] = [
  {
    id: 'D-01',
    name: 'Bác sĩ Lê Minh',
    role: 'Chuyên gia Nội nha & Điều trị Tủy',
    avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&h=200&q=80',
    room: 'Phòng 102',
    specialty: 'Trưởng khoa Bảo tồn & Vi Phẫu răng',
    degree: 'Thạc Sĩ - Bác Sĩ',
    education: ['Thạc sĩ Răng Hàm Mặt, Đại học Y Dược TP.HCM'],
    experience: 12,
  },
  {
    id: 'D-02',
    name: 'Bác sĩ Hoàng Nam',
    role: 'Chuyên gia Phẫu thuật & Nhổ răng khôn',
    avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=200&h=200&q=80',
    room: 'Phòng 105',
    specialty: 'Giám đốc Phẫu thuật Hàm Mặt & Cấy ghép Implant',
    degree: 'Bác sĩ Chuyên Khoa II',
    education: ['Bác sĩ Chuyên khoa II Phẫu thuật Hàm mặt, ĐH Y Hà Nội'],
    experience: 15,
  },
  {
    id: 'D-03',
    name: 'Bác sĩ Mai Lan',
    role: 'Chuyên gia Thẩm mỹ & Tẩy trắng răng',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&h=200&q=80',    
    room: 'Phòng 108',
    specialty: 'Trưởng bộ phận Phục Hình Thẩm Mỹ & Thiết kế nụ cười',
    degree: 'Bác sĩ Chuyên Khoa I',
    education: ['Bác sĩ Răng Hàm Mặt, Đại học Y Dược Hải Phòng'],
    experience: 8,
  },
  {
    id: 'D-04',
    name: 'Bác sĩ Nguyễn Hương',
    role: 'Chuyên khoa Chỉnh nha & Niềng răng',
    avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=150&h=150&q=80',
    room: 'Phòng 110',
    specialty: 'Cố vấn Chỉnh Nha & Chỉnh hình Răng Mặt',
    degree: 'Thạc Sĩ - Bác Sĩ',
    education: ['Thạc sĩ Chỉnh nha chuyên sâu, Đại học Nha khoa Quốc gia Seoul (Hàn Quốc)'],
    experience: 10,
  },
];

export const INITIAL_PATIENTS: Patient[] = [
  { id: 'P-9902', name: 'Nguyễn Thị Lan', phone: '0901 222 333', age: 42, gender: 'Nữ', criticalAllergy: 'Penicillin', condition: 'Đái tháo đường Tuýp 2', balance: 0, tier: 'Standard', points: 300 },
  { id: 'P-8821', name: 'Trần Nguyễn Minh', phone: '0901 234 567', age: 28, gender: 'Nam', criticalAllergy: 'Không', condition: 'Nhạy cảm ngà', balance: 4250000, tier: 'Platinum', points: 8750 },
  { id: 'P-0012', name: 'Nguyễn Văn A', phone: '0912 345 678', age: 34, gender: 'Nam', criticalAllergy: 'Không', condition: 'Bình thường', balance: 1000000, tier: 'Gold', points: 3200 },
  { id: 'P-4490', name: 'Trần Thị B', phone: '0987 654 321', age: 25, gender: 'Nữ', criticalAllergy: 'Aspirin', condition: 'Huyết áp thấp', balance: 500000, tier: 'Standard', points: 1200 },
  { id: 'P-3129', name: 'Lê Quang C', phone: '0976 543 210', age: 29, gender: 'Nam', criticalAllergy: 'Không', condition: 'Bình thường', balance: 150000, tier: 'Standard', points: 500 },
  { id: 'P-7721', name: 'Phạm Thu D', phone: '0909 999 888', age: 31, gender: 'Nữ', criticalAllergy: 'Không', condition: 'Bình thường', balance: 750000, tier: 'Gold', points: 2800 },
  { id: 'P-5021', name: 'Đặng Minh Khoa', phone: '0911 222 555', age: 38, gender: 'Nam', criticalAllergy: 'Không', condition: 'Bình thường', balance: 3000000, tier: 'Gold', points: 4100 },
  { id: 'P-5022', name: 'Nguyễn Thùy Linh', phone: '0911 333 666', age: 22, gender: 'Nữ', criticalAllergy: 'Không', condition: 'Bình thường', balance: 0, tier: 'Standard', points: 150 },
  { id: 'P-5023', name: 'Lý Kiều Trinh', phone: '0911 444 777', age: 26, gender: 'Nữ', criticalAllergy: 'Không', condition: 'Bình thường', balance: 0, tier: 'Standard', points: 200 }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  // ── Lịch hẹn hôm nay (không có ngày = hôm nay) ──
  { id: 'A-01', patientId: 'P-0012', patientName: 'Nguyễn Văn A', patientPhone: '0912 345 678', serviceName: 'Điều trị tủy răng', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', time: '09:00 AM', status: 'Confirmed' },
  { id: 'A-02', patientId: 'P-4490', patientName: 'Trần Thị B', patientPhone: '0987 654 321', serviceName: 'Tẩy trắng răng thẩm mỹ', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', time: '09:30 AM', status: 'In-Progress' },
  { id: 'A-03', patientId: 'P-3129', patientName: 'Lê Quang C', patientPhone: '0976 543 210', serviceName: 'Nhổ răng khôn thường', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', time: '10:15 AM', status: 'Confirmed' },
  { id: 'A-04', patientId: 'P-7721', patientName: 'Phạm Thu D', patientPhone: '0909 999 888', serviceName: 'Khám tổng quát & Tư vấn', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', time: '11:00 AM', status: 'Confirmed' },

  // ── Lịch hẹn ngày mai 29/06 — Bác sĩ Nguyễn Hương (TEST FLOW ĐỔI CA) ──
  {
    id: 'A-10',
    patientId: 'P-8821',
    patientName: 'Trần Nguyễn Minh',
    patientPhone: '0901 234 567',
    serviceName: 'Niềng răng/Chỉnh nha',
    dentistId: 'D-04',
    dentistName: 'Bác sĩ Nguyễn Hương',
    time: '29/06/2026 @ 09:00 AM',
    status: 'Confirmed',
  },
  {
    id: 'A-11',
    patientId: 'P-9902',
    patientName: 'Nguyễn Thị Lan',
    patientPhone: '0901 222 333',
    serviceName: 'Khám tổng quát & Tư vấn',
    dentistId: 'D-04',
    dentistName: 'Bác sĩ Nguyễn Hương',
    time: '29/06/2026 @ 10:00 AM',
    status: 'Confirmed',
  },
  {
    id: 'A-12',
    patientId: 'P-7721',
    patientName: 'Phạm Thu D',
    patientPhone: '0909 999 888',
    serviceName: 'Bọc răng sứ toàn sứ',
    dentistId: 'D-04',
    dentistName: 'Bác sĩ Nguyễn Hương',
    time: '29/06/2026 @ 02:00 PM',
    status: 'Confirmed',
  },
];

export const INITIAL_QUEUE: QueueItem[] = [
  { id: 'Q-01', patientId: 'P-5021', patientName: 'Đặng Minh Khoa', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', room: 'Phòng 105', status: 'Completed', checkInTime: '08:15 AM', waitTimeMin: 12, elapsedTimeMin: 45 },
  { id: 'Q-02', patientId: 'P-8821', patientName: 'Trần Nguyễn Minh', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', room: 'Phòng 110', status: 'In Chair', checkInTime: '08:30 AM', waitTimeMin: 15, elapsedTimeMin: 24 },
  { id: 'Q-03', patientId: 'P-4490', patientName: 'Trần Thị B', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', room: 'Phòng 105', status: 'In Chair', checkInTime: '08:45 AM', waitTimeMin: 5, elapsedTimeMin: 12 },
  { id: 'Q-04', patientId: 'P-5022', patientName: 'Nguyễn Thùy Linh', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', room: 'Phòng 102', status: 'Waiting', checkInTime: '09:10 AM', waitTimeMin: 10 },
  { id: 'Q-05', patientId: 'P-5023', patientName: 'Lý Kiều Trinh', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', room: 'Phòng 102', status: 'Waiting', checkInTime: '09:15 AM', waitTimeMin: 5 },
  { id: 'Q-10', patientId: 'P-9902', patientName: 'Nguyễn Thị Lan', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', room: 'Phòng 110', status: 'Waiting', checkInTime: '09:20 AM', waitTimeMin: 5 },
  { id: 'Q-11', patientId: 'P-0012', patientName: 'Nguyễn Văn A', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', room: 'Phòng 110', status: 'Waiting', checkInTime: '09:25 AM', waitTimeMin: 2 },
  { id: 'Q-12', patientId: 'P-3129', patientName: 'Lê Quang C', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', room: 'Phòng 110', status: 'Completed', checkInTime: '08:00 AM', waitTimeMin: 10, elapsedTimeMin: 30 }
];

export const INITIAL_INVOICES: Invoice[] = [
  { id: 'INV-9021', patientId: 'P-0012', patientName: 'Nguyễn Văn A', patientPhone: '0912 345 678', services: [{ serviceId: 'S-04', serviceName: 'Nhổ răng khôn thường (x2)', price: 3500000 }], totalPrice: 3500000, insuranceDiscount: 0, memberDiscount: 70000, netPrice: 3430000, status: 'Pending', createdAt: '2026-06-05T09:00:00Z', room: 'Phòng 105', dentistName: 'Bác sĩ Hoàng Nam', paidAmount: 0, remainingAmount: 3430000, payments: [] },
  { id: 'INV-8994', patientId: 'P-4490', patientName: 'Trần Thị B', patientPhone: '0987 654 321', services: [{ serviceId: 'S-03', serviceName: 'Trám răng thẩm mỹ (x1)', price: 850000 }], totalPrice: 850000, insuranceDiscount: 0, memberDiscount: 0, netPrice: 850000, status: 'Pending', createdAt: '2026-06-04T15:30:00Z', room: 'Phòng 102', dentistName: 'Bác sĩ Lê Minh', paidAmount: 0, remainingAmount: 850000, payments: [] },
  { id: 'INV-9023', patientId: 'P-3129', patientName: 'Lê Quang C', patientPhone: '0976 543 210', services: [{ serviceId: 'S-01', serviceName: 'Lấy cao răng & Vệ sinh', price: 300000 }], totalPrice: 300000, insuranceDiscount: 0, memberDiscount: 0, netPrice: 300000, status: 'Pending', createdAt: '2026-06-05T09:45:00Z', room: 'Phòng 108', dentistName: 'Bác sĩ Mai Lan', paidAmount: 0, remainingAmount: 300000, payments: [] },
  { id: 'INV-9024', patientId: 'P-8821', patientName: 'Trần Nguyễn Minh', patientPhone: '0901 234 567', services: [{ serviceId: 'S-07', serviceName: 'Niềng răng/Chỉnh nha', price: 30000000 }], totalPrice: 30000000, insuranceDiscount: 0, memberDiscount: 600000, netPrice: 29400000, status: 'Partially Paid', createdAt: '2026-07-01T10:15:00Z', room: 'Phòng 110', dentistName: 'Bác sĩ Nguyễn Hương', paidAmount: 10000000, remainingAmount: 19400000, payments: [{ date: '2026-07-01T10:30:00Z', amount: 10000000, method: 'Transfer' }] },
  { id: 'INV-9025', patientId: 'P-5021', patientName: 'Đặng Minh Khoa', patientPhone: '0911 222 555', services: [{ serviceId: 'S-02', serviceName: 'Tẩy trắng răng thẩm mỹ', price: 2500000 }], totalPrice: 2500000, insuranceDiscount: 0, memberDiscount: 50000, netPrice: 2450000, status: 'Pending', createdAt: '2026-06-16T11:30:00Z', room: 'Phòng 108', dentistName: 'Bác sĩ Mai Lan', paidAmount: 0, remainingAmount: 2450000, payments: [] },
  { id: 'INV-9026', patientId: 'P-4490', patientName: 'Trần Thị B', patientPhone: '0987 654 321', services: [{ serviceId: 'S-01', serviceName: 'Lấy cao răng & Vệ sinh', price: 300000 }], totalPrice: 300000, insuranceDiscount: 0, memberDiscount: 0, netPrice: 300000, status: 'Pending', createdAt: '2026-06-16T12:00:00Z', room: 'Phòng 105', dentistName: 'Bác sĩ Hoàng Nam', paidAmount: 0, remainingAmount: 300000, payments: [] },
  { id: 'INV-9027', patientId: 'P-9902', patientName: 'Nguyễn Thị Lan', patientPhone: '0901 222 333', services: [{ serviceId: 'S-03', serviceName: 'Trám răng thẩm mỹ (x1)', price: 450000 }, { serviceId: 'S-12', serviceName: 'Chụp X-quang răng', price: 150000 }], totalPrice: 600000, insuranceDiscount: 0, memberDiscount: 0, netPrice: 600000, status: 'Pending', createdAt: '2026-06-16T13:45:00Z', room: 'Phòng 110', dentistName: 'Bác sĩ Nguyễn Hương', paidAmount: 0, remainingAmount: 600000, payments: [] },
  { id: 'INV-9028', patientId: 'P-8821', patientName: 'Trần Nguyễn Minh', patientPhone: '0901 234 567', services: [{ serviceId: 'S-05', serviceName: 'Điều trị tủy răng', price: 1200000 }], totalPrice: 1200000, insuranceDiscount: 0, memberDiscount: 60000, netPrice: 1140000, status: 'Pending', createdAt: '2026-06-16T14:10:00Z', room: 'Phòng 102', dentistName: 'Bác sĩ Lê Minh', paidAmount: 0, remainingAmount: 1140000, payments: [] },
  { id: 'INV-8990', patientId: 'P-8821', patientName: 'Trần Nguyễn Minh', patientPhone: '0901 234 567', services: [{ serviceId: 'S-01', serviceName: 'Lấy cao răng & Vệ sinh', price: 300000 }], totalPrice: 300000, insuranceDiscount: 0, memberDiscount: 15000, netPrice: 285000, status: 'Paid', createdAt: '2026-07-01T09:00:00Z', room: 'Phòng 108', dentistName: 'Bác sĩ Mai Lan', paidAmount: 285000, remainingAmount: 0, payments: [{ date: '2026-07-01T09:30:00Z', amount: 285000, method: 'Cash' }] }
];

export const INITIAL_LOGS: ClinicLog[] = [
  { id: 'L-01', time: '12:30:14', module: 'AUTH', type: 'INFO', message: 'Bác sĩ Nguyễn Hương đăng nhập vào hệ thống thành công qua cổng OAuth2.' },
  { id: 'L-02', time: '12:34:02', module: 'CASHIER', type: 'SUCCESS', message: 'Giao dịch thành công: Hóa đơn #INV-9213 đã được thanh toán qua ZaloPay.' },
  { id: 'L-03', time: '12:35:10', module: 'SYSTEM', type: 'WARN', message: 'Cảnh báo: Hàng chờ tại Quầy lễ tân phát sinh tải lượng cao (> 5 bệnh nhân đang chờ).' },
  { id: 'L-04', time: '12:38:45', module: 'SYSTEM', type: 'INFO', message: 'Sao lưu dữ liệu hồ sơ bệnh án tự động hoàn tất. Tình trạng DB: Khỏe mạnh.' },
  { id: 'L-05', time: '12:40:01', module: 'RECEPTION', type: 'INFO', message: 'Đăng ký bệnh nhân mới thành công: ID-29402 - Đặng Minh Khoa.' },
  { id: 'L-06', time: '12:41:22', module: 'SYSTEM', type: 'ERR', message: 'Lỗi Timeout kết nối dịch vụ SMS Gateway (không gửi được tin nhắc hẹn).' },
  { id: 'L-07', time: '12:42:00', module: 'SYSTEM', type: 'SUCCESS', message: 'Tự động phục hồi kết nối dịch vụ SMS Gateway thành công. Đã gửi bù 3 tin nhắn.' }
];

export const INITIAL_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'MR-1002',
    patientId: 'P-8821',
    title: 'Trám Composite thẩm mỹ răng 46',
    date: '15/10/2025',
    size: '2.1 MB',
    type: 'pdf',
    dentistName: 'Bác sĩ Mai Lan',
    room: 'Phòng 105',
    diagnosis: 'Sâu men rãnh mặt nhai răng 46',
    treatments: ['Chụp X-Quang chóp răng', 'Trám Composite thẩm mỹ răng 46'],
    notes: 'Dị ứng: Không | Bệnh lý nền: Nhạy cảm ngà. Bệnh sử: Đau nhức nhẹ khi ăn đồ ngọt - Chẩn đoán: Sâu men rãnh mặt nhai răng 46 | Đơn thuốc: Sensodyne Rapid Relief (1 Tuýp) - Chải răng 2 lần/ngày',
    prescription: {
      id: 'RX-9922',
      medicines: [
        { name: 'Sensodyne Rapid Relief', dose: 'Chải răng 2 lần/ngày', duration: 'Thường xuyên', note: 'Kem đánh răng chống ê buốt' }
      ],
      instructions: 'Hạn chế ăn đồ ngọt, chua, quá nóng hoặc quá lạnh trong 24h đầu sau trám.'
    },
    files: [
      { id: 'F-112', type: 'image', title: 'X-Quang chóp răng 46', size: '2.1 MB' }
    ],
    teethMap: [
      { toothNumber: 46, condition: 'treated', treatment: 'Trám Composite thẩm mỹ răng 46' }
    ]
  },
  {
    id: 'MR-1001',
    patientId: 'P-8821',
    title: 'Tiểu phẫu nhổ răng khôn 38, 48',
    date: '28/09/2025',
    size: '4.5 MB',
    type: 'pdf',
    dentistName: 'Bác sĩ Hoàng Nam',
    room: 'Phòng 105',
    diagnosis: 'Răng khôn 38, 48 mọc lệch ngầm',
    treatments: ['Chụp X-Quang toàn hàm (Panorama)', 'Tiểu phẫu nhổ răng khôn 38, 48'],
    notes: 'Dị ứng: Không | Bệnh lý nền: Nhạy cảm ngà. Bệnh sử: Đau nhức dữ dội vùng hàm dưới trong cùng - Chẩn đoán: Răng khôn 38, 48 mọc lệch ngầm | Đơn thuốc: Augmentin 1g (20 Viên) - Uống 1 viên × 2 lần/ngày sau ăn; Efferalgan 500mg (10 Viên) - Uống 1 viên khi đau, cách ít nhất 4 giờ; Medrol 16mg (3 Viên) - Uống 1 viên × 1 lần/ngày sau ăn sáng',
    prescription: {
      id: 'RX-8821',
      medicines: [
        { name: 'Augmentin 1g', dose: '1 viên × 2 lần/ngày', duration: '7 ngày', note: 'Uống ngay sau bữa ăn' },
        { name: 'Efferalgan 500mg', dose: '1 viên khi đau', duration: 'Tối đa 4v/ngày', note: 'Cách nhau ít nhất 4 giờ' },
        { name: 'Medrol 16mg', dose: '1 viên × 1 lần/ngày', duration: '3 ngày', note: 'Uống sau ăn sáng. Giảm sưng' }
      ],
      instructions: 'Cắn chặt gạc 1 giờ. Chườm đá 24h đầu. Không dùng ống hút, không khạc nhổ. Tái khám cắt chỉ sau 7 ngày.'
    },
    files: [
      { id: 'F-111', type: 'image', title: 'Phim X-Quang Panorama Toàn hàm', size: '4.5 MB' },
      { id: 'F-110', type: 'pdf', title: 'Phiếu cam kết phẫu thuật', size: '1.2 MB' }
    ],
    teethMap: [
      { toothNumber: 38, condition: 'missing', treatment: 'Đã nhổ răng 38' },
      { toothNumber: 48, condition: 'missing', treatment: 'Đã nhổ răng 48' }
    ]
  },
  {
    id: 'MR-01',
    patientId: 'P-8821',
    title: 'Chụp X-quang Chỉnh nha Toàn cảnh (Panorama)',
    date: '24/10/2025',
    size: '4.2 MB',
    type: 'pdf',
    dentistName: 'Bác sĩ Nguyễn Hương',
    room: 'Phòng 110',
    diagnosis: 'Chụp phim Panorama khảo sát niềng răng',
    treatments: ['Chụp X-quang Panorama toàn hàm'],
    files: [
      { id: 'F-111', type: 'image', title: 'Phim X-Quang Panorama Toàn hàm', size: '4.5 MB' }
    ]
  },
  {
    id: 'MR-02',
    patientId: 'P-8821',
    title: 'Ảnh tiến trình niềng răng mặt ngoài',
    date: '10/10/2025',
    size: '1.8 MB',
    type: 'image',
    dentistName: 'Bác sĩ Nguyễn Hương',
    room: 'Phòng 110',
    diagnosis: 'Ghi hình tiến trình chỉnh nha',
    treatments: ['Ảnh chụp răng lâm sàng'],
    files: [
      { id: 'F-112', type: 'image', title: 'Ảnh tiến trình niềng răng mặt ngoài', size: '1.8 MB' }
    ]
  },
  {
    id: 'MR-03',
    patientId: 'P-8821',
    title: 'Đơn thuốc giảm đau hậu phẫu răng khôn',
    date: '28/09/2025',
    size: '120 KB',
    type: 'prescription',
    dentistName: 'Bác sĩ Hoàng Nam',
    room: 'Phòng 105',
    diagnosis: 'Đau nhức nhẹ sau nhổ răng khôn',
    treatments: ['Kê đơn thuốc giảm đau'],
    notes: 'Dị ứng: Không | Bệnh lý nền: Nhạy cảm ngà. Bệnh sử: Khám răng định kỳ - Chẩn đoán: Đau nhức sau nhổ răng khôn | Đơn thuốc: Paracetamol 500mg (10 Viên) - Uống Paracetamol 500mg, 1 viên mỗi 6 giờ khi đau.',
    prescription: {
      id: 'RX-MR03',
      medicines: [
        { name: 'Paracetamol 500mg', dose: '1 viên mỗi 6 giờ khi đau', duration: '10 Viên', note: 'Uống sau ăn' }
      ],
      instructions: 'Nghỉ ngơi, uống nhiều nước.'
    }
  },
  {
    id: 'MR-04',
    patientId: 'P-9902',
    title: 'Hồ sơ bệnh án phục hình răng hàm dưới',
    date: '12/10/2025',
    size: '1.2 MB',
    type: 'pdf',
    dentistName: 'Bác sĩ Nguyễn Hương',
    room: 'Phòng 110',
    diagnosis: 'Sâu răng 46 & mất răng 38',
    treatments: ['Hàn răng Composite', 'Nhổ răng'],
    notes: 'Lấy cao răng toàn hàm. Hàn răng sâu số 46 bằng Composite.',
    teethMap: [
      { toothNumber: 46, condition: 'decay', treatment: 'Hàn răng Composite' },
      { toothNumber: 38, condition: 'missing', treatment: 'Đã nhổ' }
    ]
  }
];

export const INITIAL_DENTIST_SHIFTS: DoctorShift[] = [
  { id: 'SH-01', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-01', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-02', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-01', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-03', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-02', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-04', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-02', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-05', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-03', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-06', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-03', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-07', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-03', shiftType: 'Full', room: 'Phòng 110' },
  { id: 'SH-08', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-04', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-09', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-04', shiftType: 'Afternoon', room: 'Phòng 102' },
  { id: 'SH-10', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-05', shiftType: 'Morning', room: 'Phòng 105' },
  { id: 'SH-11', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-05', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-12', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-06', shiftType: 'Full', room: 'Phòng 108' },
  { id: 'SH-13', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-06', shiftType: 'Afternoon', room: 'Phòng 102' },
  
  { id: 'SH-14', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-08', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-15', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-08', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-16', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-09', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-17', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-09', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-18', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-10', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-19', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-10', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-20', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-11', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-21', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-11', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-22', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-12', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-23', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-12', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-24', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-12', shiftType: 'Full', room: 'Phòng 110' },
  { id: 'SH-25', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-13', shiftType: 'Full', room: 'Phòng 108' },
  { id: 'SH-26', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-13', shiftType: 'Afternoon', room: 'Phòng 102' },

  { id: 'SH-27', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-15', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-28', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-15', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-29', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-16', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-30', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-16', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-31', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-17', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-32', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-17', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-33', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-18', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-34', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-18', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-35', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-19', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-36', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-19', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-37', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-19', shiftType: 'Full', room: 'Phòng 110' },
  { id: 'SH-38', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-20', shiftType: 'Full', room: 'Phòng 108' },
  { id: 'SH-39', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-20', shiftType: 'Afternoon', room: 'Phòng 102' },

  { id: 'SH-40', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-22', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-41', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-22', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-42', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-23', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-43', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-23', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-44', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-24', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-45', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-24', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-46', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-25', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-47', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-25', shiftType: 'Afternoon', room: 'Phòng 110' },
  { id: 'SH-48', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-26', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-49', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-26', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-50', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-26', shiftType: 'Full', room: 'Phòng 110' },
  { id: 'SH-51', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-27', shiftType: 'Full', room: 'Phòng 108' },
  { id: 'SH-52', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-27', shiftType: 'Afternoon', room: 'Phòng 102' },

  { id: 'SH-53', dentistId: 'D-01', dentistName: 'Bác sĩ Lê Minh', date: '2026-06-29', shiftType: 'Morning', room: 'Phòng 102' },
  { id: 'SH-54', dentistId: 'D-02', dentistName: 'Bác sĩ Hoàng Nam', date: '2026-06-29', shiftType: 'Afternoon', room: 'Phòng 105' },
  { id: 'SH-57', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-29', shiftType: 'Full', room: 'Phòng 110' },
  { id: 'SH-55', dentistId: 'D-03', dentistName: 'Bác sĩ Mai Lan', date: '2026-06-30', shiftType: 'Morning', room: 'Phòng 108' },
  { id: 'SH-56', dentistId: 'D-04', dentistName: 'Bác sĩ Nguyễn Hương', date: '2026-06-30', shiftType: 'Afternoon', room: 'Phòng 110' }
];

// ─── MOCK: Shift Change Notifications ────────────────────────────────────────
// Kịch bản TEST: Manager nhờ trực thay — BS Nguyễn Hương đổi ca Cả ngày 29/06
// sang BS Lê Minh. Có 3 bệnh nhân đã đặt lịch với BS Nguyễn Hương hôm đó.
export const INITIAL_SHIFT_NOTIFICATIONS: ShiftChangeNotification[] = [
  {
    id: 'SCN-001',
    createdAt: '2026-06-28T09:00:00.000Z',
    shiftDate: '2026-06-29',
    shiftType: 'Full',
    originalDentistId: 'D-04',
    originalDentistName: 'Bác sĩ Nguyễn Hương',
    newDentistId: 'D-01',
    newDentistName: 'Bác sĩ Lê Minh',
    affectedItems: [
      {
        appointmentId: 'A-10',
        patientName: 'Trần Nguyễn Minh',
        patientPhone: '0901 234 567',
        time: '29/06/2026 @ 09:00 AM',
        serviceName: 'Niềng răng/Chỉnh nha',
        resolved: false,
      },
      {
        appointmentId: 'A-11',
        patientName: 'Nguyễn Thị Lan',
        patientPhone: '0901 222 333',
        time: '29/06/2026 @ 10:00 AM',
        serviceName: 'Khám tổng quát & Tư vấn',
        resolved: false,
      },
      {
        appointmentId: 'A-12',
        patientName: 'Phạm Thu D',
        patientPhone: '0909 999 888',
        time: '29/06/2026 @ 02:00 PM',
        serviceName: 'Bọc răng sứ toàn sứ',
        resolved: false,
      },
    ],
  },
];
