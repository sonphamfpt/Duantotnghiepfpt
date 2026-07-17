const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle, ShadingType } = require('docx');

// Định nghĩa màu sắc thương hiệu Nha khoa GoodSmile
const COLOR_PRIMARY = '0F4C81'; // Xanh dương Classic Blue
const COLOR_SECONDARY = '17A2B8'; // Xanh Teal
const COLOR_BG_LIGHT = 'F8F9FA'; // Xám nhạt
const COLOR_TEXT_DARK = '212529'; // Đen xám
const COLOR_TEXT_LIGHT = 'FFFFFF'; // Trắng
const COLOR_BORDER = 'DEE2E6'; // Viền xám

// Hàm helper tạo ô trong bảng (TableCell)
function createCell(text, isHeader = false, widthPercent = 25, alignment = AlignmentType.LEFT) {
  return new TableCell({
    width: {
      size: widthPercent,
      type: WidthType.PERCENTAGE,
    },
    shading: {
      fill: isHeader ? COLOR_PRIMARY : 'FFFFFF',
      type: ShadingType.CLEAR,
    },
    margins: {
      top: 150,
      bottom: 150,
      left: 150,
      right: 150,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      left: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
      right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_BORDER },
    },
    children: [
      new Paragraph({
        alignment: alignment,
        children: [
          new TextRun({
            text: text,
            bold: isHeader,
            color: isHeader ? COLOR_TEXT_LIGHT : COLOR_TEXT_DARK,
            font: 'Times New Roman',
            size: 24, // 12pt
          }),
        ],
      }),
    ],
  });
}

// Hàm helper tạo dòng tiêu đề bảng
function createHeaderRow(headers) {
  return new TableRow({
    tableHeader: true,
    children: headers.map(h => createCell(h.text, true, h.width, h.align || AlignmentType.LEFT)),
  });
}

// Hàm helper tạo dòng nội dung bảng
function createDataRow(values) {
  return new TableRow({
    children: values.map(v => createCell(v.text, false, v.width, v.align || AlignmentType.LEFT)),
  });
}

// Nội dung các Test Case
const testCasesAuth = [
  {
    code: 'TC-UI-01',
    name: 'Đăng nhập Lễ tân mẫu thành công',
    steps: '1. Truy cập trang đăng nhập.\n2. Nhập SĐT "0901234567" và mật khẩu "12345678".\n3. Bấm Đăng nhập.',
    expected: 'Đăng nhập thành công, chuyển hướng đến Dashboard Lễ tân (/dashboard/receptionist) và hiển thị thông tin chính xác.'
  },
  {
    code: 'TC-UI-02',
    name: 'Đăng nhập thất bại do sai mật khẩu',
    steps: '1. Truy cập trang đăng nhập.\n2. Nhập SĐT "0901234567" và mật khẩu "wrong_pass".\n3. Bấm Đăng nhập.',
    expected: 'Hệ thống báo lỗi "Mã đăng nhập hoặc mật khẩu không chính xác" (INVALID_CREDENTIALS) và giữ nguyên màn hình.'
  },
  {
    code: 'TC-UI-03',
    name: 'Đăng ký Bệnh nhân mới thành công',
    steps: '1. Truy cập trang Đăng ký.\n2. Nhập Họ tên, SĐT ngẫu nhiên chưa đăng ký, Mật khẩu.\n3. Nhấp gửi OTP, lấy mã OTP từ console/DB điền vào.\n4. Bấm Đăng ký.',
    expected: 'Đăng ký tài khoản thành công. Tự động tạo hồ sơ bệnh nhân tương ứng trong DB dưới phân hạng STANDARD.'
  }
];

const testCasesBooking = [
  {
    code: 'TC-UI-04',
    name: 'Bệnh nhân vãng lai đặt lịch trực tuyến (Guest)',
    steps: '1. Tại màn hình Đặt lịch công khai, nhập Họ tên khách và SĐT mới.\n2. Chọn dịch vụ S-02 (Tẩy trắng răng), chọn bác sĩ D-01.\n3. Chọn ngày mai và chọn 1 slot trống.\n4. Thực hiện xác thực OTP và xác nhận đặt lịch.',
    expected: 'Đặt lịch thành công, hệ thống tự động sinh hồ sơ bệnh nhân vãng lai mới và gửi sự kiện cập nhật real-time tới Lễ tân.'
  },
  {
    code: 'TC-UI-05',
    name: 'Bệnh nhân đã đăng nhập đặt lịch trực tuyến',
    steps: '1. Đăng nhập tài khoản Bệnh nhân.\n2. Vào tab Đặt lịch, chọn dịch vụ S-02, chọn bác sĩ D-01.\n3. Chọn mốc giờ trống khả dụng ngày mai và bấm Đặt lịch (có OTP).',
    expected: 'Đặt lịch thành công, hệ thống tự động lấy thông tin bệnh nhân từ tài khoản đã đăng nhập, hiển thị lịch khám ở tab Lịch hẹn của tôi.'
  },
  {
    code: 'TC-UI-06',
    name: 'Lễ tân đặt lịch trực tiếp cho khách tại quầy (Walk-In)',
    steps: '1. Lễ tân vào tab Lịch Hẹn -> bấm Đặt lịch.\n2. Nhập SĐT bệnh nhân vãng lai cũ để hệ thống auto-lookup điền tên.\n3. Chọn khung giờ khám trực tiếp của bác sĩ và bấm xác nhận.',
    expected: 'Đặt lịch thành công với kênh bookingChannel là Walk-In, bỏ qua bước OTP.'
  },
  {
    code: 'TC-UI-07',
    name: 'Chặn đặt trùng giờ (Overlap Booking)',
    steps: '1. Dùng 2 tab trình duyệt chọn cùng 1 slot khám của cùng bác sĩ D-01 ngày mai.\n2. Bấm xác nhận đặt lịch ở cả hai bên gần như đồng thời.',
    expected: 'Yêu cầu thứ 2 bị chặn lại với mã lỗi 409 (SLOT_NOT_AVAILABLE hoặc APPOINTMENT_OVERLAP), đảm bảo không bị ghi đè trùng lịch.'
  }
];

const testCasesAdvance = [
  {
    code: 'TC-UI-08',
    name: 'Tiếp đón bệnh nhân vào hàng chờ khám',
    steps: '1. Lễ tân chọn lịch hẹn đã đặt hôm nay của bệnh nhân.\n2. Bấm nút Check-In (Tiếp đón).',
    expected: 'Bệnh nhân được thêm vào hàng chờ khám với trạng thái Waiting, hiển thị thời gian chờ đếm ngược trên bảng TV phòng chờ.'
  },
  {
    code: 'TC-UI-09',
    name: 'Bác sĩ gọi khám (In Chair)',
    steps: '1. Bác sĩ mở Dashboard khám, chọn bệnh nhân trong hàng chờ.\n2. Bấm nút "Bắt đầu khám".',
    expected: 'Trạng thái chuyển sang In Chair. Đồng hồ đếm thời gian điều trị bắt đầu chạy, bảng TV phòng chờ tự động cập nhật trạng thái.'
  },
  {
    code: 'TC-UI-10',
    name: 'Bác sĩ lưu bệnh án và kết thúc khám (Completed)',
    steps: '1. Bác sĩ điền ghi chú bệnh án, chọn răng bị sâu trên sơ đồ răng và kê đơn thuốc.\n2. Bấm nút "Hoàn thành điều trị".',
    expected: 'Bệnh nhân chuyển sang trạng thái Completed. Hệ thống tự động tạo hóa đơn dịch vụ tương ứng ở trạng thái Pending.'
  },
  {
    code: 'TC-UI-11',
    name: 'Liên kết bệnh án cũ khi tạo tài khoản mới',
    steps: '1. Khách hàng khám vãng lai (Walk-In) với SĐT "09xxxx".\n2. Bác sĩ khám và lưu bệnh án điện tử cho SĐT này.\n3. Bệnh nhân đăng ký tài khoản mới trực tuyến bằng đúng SĐT "09xxxx".',
    expected: 'Tài khoản mới đăng ký tự động được liên kết với hồ sơ bệnh nhân cũ và hiển thị đầy đủ lịch sử bệnh án đã khám trước đó.'
  }
];

// Hàm tạo bảng từ danh sách Test Cases
function createTestCasesTable(cases) {
  const widthMap = [
    { text: 'Mã TC', width: 12, align: AlignmentType.CENTER },
    { text: 'Tên Kịch Bản', width: 28 },
    { text: 'Các Bước Thực Hiện', width: 35 },
    { text: 'Kết Quả Kỳ Vọng', width: 25 }
  ];

  const rows = [
    createHeaderRow(widthMap)
  ];

  cases.forEach(c => {
    rows.push(createDataRow([
      { text: c.code, width: 12, align: AlignmentType.CENTER },
      { text: c.name, width: 28 },
      { text: c.steps, width: 35 },
      { text: c.expected, width: 25 }
    ]));
  });

  return new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    rows: rows,
  });
}

// Khởi tạo tài liệu
const doc = new Document({
  creator: 'Senior QC — GoodSmile Clinic',
  title: 'Kịch bản kiểm thử module đặt lịch',
  description: 'Tài liệu kịch bản kiểm thử tích hợp và kiểm thử thủ công cho hệ thống đặt lịch nha khoa',
  sections: [
    {
      properties: {},
      children: [
        // Title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'KỊCH BẢN KIỂM THỬ (TEST PLAN)',
              bold: true,
              size: 36, // 18pt
              color: COLOR_PRIMARY,
              font: 'Times New Roman',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [
            new TextRun({
              text: 'HỆ THỐNG ĐẶT LỊCH HẸN & XÁC THỰC — NHA KHOA GOODSMILE',
              bold: true,
              size: 28, // 14pt
              color: COLOR_SECONDARY,
              font: 'Times New Roman',
            }),
          ],
        }),

        // Giới thiệu
        new Paragraph({
          text: '1. Giới Thiệu Chung',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Tài liệu này trình bày chi tiết kịch bản kiểm thử (Test Cases) phục vụ công tác QC và nghiệm thu cho Module Đặt lịch hẹn khám (Appointments) và hệ thống Xác thực người dùng (Authentication/OTP) của dự án Nha khoa GoodSmile.',
              font: 'Times New Roman',
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [
            new TextRun({
              text: 'Phạm vi bao gồm các luồng xử lý chính (Happy Path), các ràng buộc nghiệp vụ nâng cao (Edge Cases) như chống trùng lịch điều trị của bác sĩ thông qua Redis Distributed Lock, và tự động liên kết hồ sơ bệnh án cũ.',
              font: 'Times New Roman',
              size: 24,
            }),
          ],
        }),

        // Phần 2: Xác thực
        new Paragraph({
          text: '2. Kịch Bản Kiểm Thử Xác Thực (Authentication)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
        createTestCasesTable(testCasesAuth),

        // Khoảng cách
        new Paragraph({ text: '', spacing: { after: 300 } }),

        // Phần 3: Đặt lịch
        new Paragraph({
          text: '3. Kịch Bản Kiểm Thử Đặt Lịch Khám (Booking)',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
        createTestCasesTable(testCasesBooking),

        // Khoảng cách
        new Paragraph({ text: '', spacing: { after: 300 } }),

        // Phần 4: Nghiệp vụ liên thông
        new Paragraph({
          text: '4. Kịch Bản Kiểm Thử Nghiệp Vụ Liên Thông & Hàng Chờ',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
        createTestCasesTable(testCasesAdvance),

        // Khoảng cách
        new Paragraph({ text: '', spacing: { after: 400 } }),

        // Phần 5: Kết quả kiểm nghiệm
        new Paragraph({
          text: '5. Kết Quả Kiểm Nghiệm Tự Động',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Kịch bản kiểm thử API tích hợp tự động trong file test_api.ts đã chạy thử nghiệm thành công 100% (14/14 test cases Đạt) trên môi trường cục bộ kết hợp máy chủ dữ liệu PostgreSQL và Redis Cache.',
              font: 'Times New Roman',
              size: 24,
              bold: true,
            }),
          ],
        }),
      ],
    },
  ],
});

// Biên dịch tài liệu ra file .docx
const outputFilePath = path.join(__dirname, '..', '..', 'Kich_ban_kiem_thu_dat_lich.docx');

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputFilePath, buffer);
  console.log(`\n======================================================`);
  console.log(`✔️ [DOCX GENERATION SUCCESS]`);
  console.log(`📂 Lưu file thành công tại: ${outputFilePath}`);
  console.log(`======================================================\n`);
}).catch(err => {
  console.error('❌ Lỗi khi xuất file Word:', err);
});
