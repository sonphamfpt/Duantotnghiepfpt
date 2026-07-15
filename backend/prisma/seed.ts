import { PrismaClient, RoleCode } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

function splitSqlStatements(sql: string): string[] {
  // Loại bỏ các dòng comment một dòng để tránh lọc nhầm câu lệnh
  const lines = sql.split('\n');
  const cleanSql = lines
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('--')) {
        return '';
      }
      const commentIdx = line.indexOf('--');
      if (commentIdx !== -1) {
        return line.slice(0, commentIdx);
      }
      return line;
    })
    .join('\n');

  const statements: string[] = [];
  let currentStatement = '';
  let inDollarQuote = false;
  
  for (let i = 0; i < cleanSql.length; i++) {
    const char = cleanSql[i];
    
    // Phát hiện ký tự mở/đóng chuỗi dollar-quoted ($$) của PL/pgSQL
    if (char === '$' && cleanSql[i + 1] === '$') {
      inDollarQuote = !inDollarQuote;
      currentStatement += '$$';
      i++; // Bỏ qua ký tự '$' thứ hai
      continue;
    }
    
    // Nếu gặp dấu chấm phẩy bên ngoài chuỗi dollar-quoted thì tách câu lệnh
    if (char === ';' && !inDollarQuote) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    } else {
      currentStatement += char;
    }
  }
  
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }
  
  return statements.filter(s => s.length > 0);
}

async function main() {
  console.log('🌱 Bắt đầu chạy Seed Database...');

  // 0. XÓA DỮ LIỆU CŨ TRƯỚC KHI SEED (CASCADE)
  console.log('🧹 Đang dọn dẹp cơ sở dữ liệu...');
  try {
    // Xóa trigger cũ nếu tồn tại trong DB để tránh xung đột với logic phân hạng mới
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_add_patient_loyalty_points ON payments;
    `);
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE "roles", "membership_tiers", "rooms", "service_categories", "services", "clinic_operating_hours", "users", "patients", "dentists", "dentist_shifts", "appointments", "queue_tickets", "invoices", "payments" RESTART IDENTITY CASCADE;
    `);
  } catch (err: any) {
    console.warn(`⚠️ Cảnh báo dọn dẹp DB: ${err.message}`);
  }

  // 1. CHẠY FILE SQL TRIGGER & EXCLUDE CONSTRAINTS THỦ CÔNG
  const sqlPath = path.join(__dirname, 'migrations', '001_exclude_constraint_and_trigger.sql');
  if (fs.existsSync(sqlPath)) {
    console.log('⚡ Đang áp dụng các SQL Trigger và Ràng buộc Exclude...');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = splitSqlStatements(sql);
    
    for (const statement of statements) {
      try {
        await prisma.$executeRawUnsafe(statement);
      } catch (err: any) {
        console.error(`❌ Lỗi khi thiết lập trigger/constraint: ${err.message}`);
        console.error(`Chi tiết câu lệnh lỗi:\n${statement}`);
        throw err;
      }
    }
    console.log('✅ Áp dụng SQL Trigger thành công!');
  } else {
    console.warn('⚠️ Không tìm thấy file SQL trigger tại:', sqlPath);
  }

  // 2. SEED BẢNG ROLES
  console.log('👥 Đang tạo danh sách Role...');
  const roles = [
    { code: RoleCode.patient, name: 'Bệnh nhân' },
    { code: RoleCode.receptionist, name: 'Lễ tân' },
    { code: RoleCode.dentist, name: 'Bác sĩ nha khoa' },
    { code: RoleCode.cashier, name: 'Thu ngân' },
    { code: RoleCode.manager, name: 'Quản lý phòng khám' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }

  // 3. SEED BẢNG MEMBERSHIP TIERS (Sử dụng minPoints như số lượt khám tối thiểu)
  console.log('👑 Đang tạo danh sách Membership Tier...');
  const tiers = [
    { code: 'STANDARD', name: 'Standard', minPoints: 0, discountPercent: 0 },
    { code: 'GOLD', name: 'Gold', minPoints: 3, discountPercent: 5 },
    { code: 'PLATINUM', name: 'Platinum', minPoints: 8, discountPercent: 10 },
    { code: 'DIAMOND', name: 'Diamond', minPoints: 15, discountPercent: 15 },
  ];

  const tierMap: Record<string, number> = {};
  for (const tier of tiers) {
    const created = await prisma.membershipTier.upsert({
      where: { code: tier.code },
      update: {},
      create: tier,
    });
    tierMap[tier.name.toLowerCase()] = created.tierId;
  }

  // 4. SEED ROOMS
  console.log('🏥 Đang tạo danh sách phòng khám...');
  const rooms = [
    { name: 'Phòng 102' },
    { name: 'Phòng 105' },
    { name: 'Phòng 108' },
    { name: 'Phòng 110' },
  ];
  
  const roomMap: Record<string, number> = {};
  for (const room of rooms) {
    const created = await prisma.room.upsert({
      where: { name: room.name },
      update: {},
      create: room,
    });
    roomMap[room.name] = created.roomId;
  }

  // 5. SEED SERVICE CATEGORIES & SERVICES
  console.log('🦷 Đang tạo danh sách Dịch Vụ...');
  const category = await prisma.serviceCategory.upsert({
    where: { name: 'Nha khoa Tổng quát' },
    update: {},
    create: { name: 'Nha khoa Tổng quát' },
  });

  const services = [
    { name: 'Lấy cao răng & Vệ sinh răng miệng nâng cao', price: 300000, durationMinutes: 20 },
    { name: 'Tẩy trắng răng thẩm mỹ nhanh bằng Laser', price: 2500000, durationMinutes: 45 },
    { name: 'Trám răng composite thẩm mỹ (mỗi răng)', price: 450000, durationMinutes: 25 },
    { name: 'Nhổ răng khôn thường (hàm trên)', price: 1750000, durationMinutes: 30 },
    { name: 'Nhổ răng khôn mọc lệch (tiểu phẫu hàm dưới)', price: 3500000, durationMinutes: 60 },
    { name: 'Điều trị tủy răng nội nha định vị chóp', price: 1200000, durationMinutes: 45 },
    { name: 'Trồng răng Implant Straumann (Thuỵ Sĩ)', price: 25000000, durationMinutes: 60 },
    { name: 'Trồng răng Implant Dentium (Hàn Quốc)', price: 15000000, durationMinutes: 60 },
    { name: 'Niềng răng mắc cài kim loại tự buộc', price: 30000000, durationMinutes: 45 },
    { name: 'Niềng răng khay trong suốt Invisalign', price: 80000000, durationMinutes: 45 },
    { name: 'Khám răng tổng quát & Lập kế hoạch điều trị', price: 100000, durationMinutes: 15 },
    { name: 'Bọc răng sứ Cercon HT toàn sứ thẩm mỹ', price: 5000000, durationMinutes: 60 },
    { name: 'Gắn đá kim cương nha khoa thẩm mỹ', price: 500000, durationMinutes: 20 },
    { name: 'Tiểu phẫu cắt chóp răng & Bơm rửa tủy', price: 3000000, durationMinutes: 45 },
    { name: 'Chụp X-quang Panorama toàn hàm', price: 150000, durationMinutes: 10 },
    { name: 'Chụp phim CT ConeBeam 3D cắt lớp', price: 500000, durationMinutes: 15 }
  ];

  for (const s of services) {
    await prisma.service.create({
      data: {
        categoryId: category.categoryId,
        name: s.name,
        price: s.price,
        durationMinutes: s.durationMinutes,
        bufferMinutes: 0,
        isActive: true,
      }
    });
  }

  // 6. SEED CLINIC OPERATING HOURS
  console.log('⏰ Đang tạo giờ mở cửa phòng khám...');
  // 0 = Chủ Nhật, ..., 6 = Thứ Bảy
  for (let i = 0; i <= 6; i++) {
    await prisma.clinicOperatingHour.upsert({
      where: { weekday: i },
      update: {},
      create: {
        weekday: i,
        openTime: new Date('1970-01-01T08:00:00Z'),
        closeTime: new Date('1970-01-01T20:00:00Z'),
        lunchStart: null,
        lunchEnd: null,
        isClosed: false,
      }
    });
  }

  // 7. SEED USERS & STAFF & PATIENTS
  console.log('👤 Đang tạo tài khoản người dùng mẫu...');
  
  // Lấy Role IDs
  const rolePatient = await prisma.role.findUnique({ where: { code: RoleCode.patient } });
  const roleDentist = await prisma.role.findUnique({ where: { code: RoleCode.dentist } });
  const roleManager = await prisma.role.findUnique({ where: { code: RoleCode.manager } });
  const roleReceptionist = await prisma.role.findUnique({ where: { code: RoleCode.receptionist } });
  const roleCashier = await prisma.role.findUnique({ where: { code: RoleCode.cashier } });

  // 7.1 Tạo Quản lý / Admin
  const adminUser = await prisma.user.create({
    data: {
      roleId: roleManager!.roleId,
      email: 'manager@goodsmile.vn',
      passwordHash: '$2b$10$AGg5dmxgt19uWEeL.RgSKOUBA1XHNUSz7yu3wRc6iwo9vxzEiktiW', // mật khẩu: 12345678
      fullName: 'Quản trị viên GoodSmile',
      status: 'Active',
    }
  });

  // 7.1.2 Tạo Lễ Tân
  await prisma.user.create({
    data: {
      roleId: roleReceptionist!.roleId,
      email: 'receptionist@goodsmile.vn',
      passwordHash: '$2b$10$AGg5dmxgt19uWEeL.RgSKOUBA1XHNUSz7yu3wRc6iwo9vxzEiktiW', // mật khẩu: 12345678
      fullName: 'Nguyễn Lễ Tân',
      status: 'Active',
    }
  });

  // 7.1.3 Tạo Thu Ngân
  await prisma.user.create({
    data: {
      roleId: roleCashier!.roleId,
      email: 'cashier@goodsmile.vn',
      passwordHash: '$2b$10$AGg5dmxgt19uWEeL.RgSKOUBA1XHNUSz7yu3wRc6iwo9vxzEiktiW', // mật khẩu: 12345678
      fullName: 'Nguyễn Thu Ngân',
      status: 'Active',
    }
  });

  // 7.2 Tạo Bác sĩ
  const dentists = [
    {
      name: 'Bác sĩ Lê Minh',
      email: 'leminh@goodsmile.vn',
      specialty: 'Trưởng khoa Bảo tồn & Vi Phẫu răng',
      degree: 'Thạc Sĩ - Bác Sĩ',
      room: 'Phòng 102',
      experience: 12,
      cases: '8,500+ ca',
      motto: 'Bảo tồn răng thật của bệnh nhân là sứ mệnh tối cao của một người bác sĩ nha khoa y đức.',
      bio: 'Bác sĩ Lê Minh là chuyên gia hàng đầu về nội nha và vi phẫu tại GoodSmile. Với hơn 12 năm kinh nghiệm thực tiễn và tinh thần tỉ mỉ, bác sĩ đã cứu giữ thành công hàng ngàn chiếc răng tự nhiên cho khách hàng, hạn chế tối đa việc phải nhổ bỏ.',
      education: [
        'Thạc sĩ Răng Hàm Mặt, Đại học Y Dược TP.HCM',
        'Tu nghiệp Nội nha chuyên sâu, Đại học Pennsylvania (Hoa Kỳ)',
        'Chứng chỉ điều trị vi phẫu nội nha nâng cao tại Singapore'
      ],
      clinicalStrengths: [
        'Điều trị tủy răng phức tạp dưới kính hiển vi',
        'Vi phẫu cuống răng và phục hồi cuống răng tổn thương',
        'Tái tạo răng thẩm mỹ sau điều trị tủy'
      ],
      certifications: [
        'Hội viên chính thức Hiệp hội Nội nha Hoa Kỳ (AAE)',
        'Chứng nhận giảng viên vi phẫu nha khoa khu vực Đông Nam Á',
        'Hội viên Hội Răng Hàm Mặt Việt Nam (VOSA)'
      ],
      workHistory: [
        { periodText: '2014 - 2018', description: 'Bác sĩ điều trị Nội nha tại Bệnh viện Răng Hàm Mặt Trung ương TP.HCM' },
        { periodText: '2018 - 2022', description: 'Giảng viên lâm sàng Khoa Răng Hàm Mặt, Đại học Y Dược TP.HCM' },
        { periodText: '2022 - Nay', description: 'Trưởng khoa Bảo tồn & Vi Phẫu răng tại Hệ thống Nha khoa GoodSmile' }
      ]
    },
    {
      name: 'Bác sĩ Hoàng Nam',
      email: 'hoangnam@goodsmile.vn',
      specialty: 'Giám đốc Phẫu thuật Hàm Mặt & Cấy ghép Implant',
      degree: 'Bác sĩ Chuyên Khoa II',
      room: 'Phòng 105',
      experience: 15,
      cases: '5,200+ ca',
      motto: 'Một ca phẫu thuật thành công không chỉ dựa trên kỹ thuật chính xác, mà còn ở sự thấu hiểu và an tâm của người bệnh.',
      bio: 'Bác sĩ Hoàng Nam được mệnh danh là "bàn tay vàng" trong lĩnh vực cấy ghép Implant tại Việt Nam. Bác sĩ luôn áp dụng các công nghệ kỹ thuật số hiện đại nhất giúp giảm thiểu sưng đau, rút ngắn thời gian lành thương tối đa cho bệnh nhân.',
      education: [
        'Bác sĩ Chuyên khoa II Phẫu thuật Hàm mặt, ĐH Y Hà Nội',
        'Tu nghiệp chuyên sâu Cấy ghép Implant, Đại học Bordeaux (Pháp)',
        'Chứng chỉ cấy ghép xương hàm và nâng xoang nâng cao tại Thụy Sĩ'
      ],
      clinicalStrengths: [
        'Cấy ghép Implant tức thì All-on-4 và All-on-6 cho người mất răng toàn hàm',
        'Phẫu thuật nhổ răng khôn ngầm bằng công nghệ siêu âm Piezotome không đau',
        'Ghép xương tự thân, nâng xoang kín và xoang hở trong cấy ghép Implant phức tạp'
      ],
      certifications: [
        'Thành viên chính thức Hiệp hội Implant Quốc tế (ITI Fellow)',
        'Chuyên gia cố vấn lâm sàng khu vực Châu Á - Thái Bình Dương của Straumann (Thụy Sĩ)',
        'Chứng chỉ Phẫu thuật hàm mặt chuyên sâu cấp bởi Bộ Y Tế Pháp'
      ],
      workHistory: [
        { periodText: '2011 - 2016', description: 'Bác sĩ Phẫu thuật hàm mặt tại Bệnh viện Hữu nghị Việt Đức' },
        { periodText: '2016 - 2021', description: 'Trưởng khoa Phẫu thuật cấy ghép nha khoa tại Bệnh viện Răng Hàm Mặt Quốc tế' },
        { periodText: '2021 - Nay', description: 'Giám đốc Phẫu thuật Hàm Mặt & Cấy ghép Implant tại Hệ thống Nha khoa GoodSmile' }
      ]
    },
    {
      name: 'Bác sĩ Mai Lan',
      email: 'mailan@goodsmile.vn',
      specialty: 'Trưởng bộ phận Phục Hình Thẩm Mỹ & Thiết kế nụ cười',
      degree: 'Bác sĩ Chuyên Khoa I',
      room: 'Phòng 108',
      experience: 8,
      cases: '4,100+ ca',
      motto: 'Mỗi nụ cười là một tác phẩm nghệ thuật độc bản. Bác sĩ nha khoa thẩm mỹ là một nghệ sĩ y khoa.',
      bio: 'Bác sĩ Mai Lan là người mang lại nụ cười rạng rỡ và tự tin cho hàng ngàn khách hàng, bao gồm nhiều nghệ sĩ và doanh nhân nổi tiếng. Bác sĩ kết hợp hoàn hảo giữa kiến thức y khoa chuẩn mực và mắt thẩm mỹ tinh tế nghệ thuật.',
      education: [
        'Bác sĩ Răng Hàm Mặt, Đại học Y Dược Hải Phòng',
        'Tốt nghiệp chương trình đào tạo Nha khoa Thẩm mỹ Châu Á (AACD)',
        'Khóa đào tạo chuyên gia thiết kế nụ cười kỹ thuật số (DSD) tại Tokyo (Nhật Bản)'
      ],
      clinicalStrengths: [
        'Thiết kế và dán sứ Veneer siêu mỏng Emax hạn chế tối đa mài răng thật',
        'Phục hình răng sứ thẩm mỹ CAD/CAM nguyên khối tự nhiên',
        'Thiết kế nụ cười toàn diện Digital Smile Design chuẩn nhân tướng học'
      ],
      certifications: [
        'Hội viên Hiệp hội Nha khoa Thẩm mỹ Hoa Kỳ (AACD)',
        'Chứng nhận chuyên gia DSD Master Quốc tế',
        'Thành viên Hiệp hội Nha khoa Thẩm mỹ Châu Á (AAAD)'
      ],
      workHistory: [
        { periodText: '2018 - 2020', description: 'Bác sĩ Phục hình răng tại Nha khoa Quốc tế Elite' },
        { periodText: '2020 - 2023', description: 'Chuyên gia phục hình thẩm mỹ cao cấp tại Nha khoa Paris' },
        { periodText: '2023 - Nay', description: 'Trưởng bộ phận Phục Hình Thẩm Mỹ & Thiết kế nụ cười tại Hệ thống Nha khoa GoodSmile' }
      ]
    },
    {
      name: 'Bác sĩ Nguyễn Hương',
      email: 'nguyenhuong@goodsmile.vn',
      specialty: 'Cố vấn Chỉnh Nha & Chỉnh hình Răng Mặt',
      degree: 'Thạc Sĩ - Bác Sĩ',
      room: 'Phòng 110',
      experience: 10,
      cases: '6,300+ ca',
      motto: 'Chỉnh nha không chỉ làm đều răng, mà là tái cấu trúc nụ cười và cải thiện chất lượng sống của bệnh nhân.',
      bio: 'Bác sĩ Nguyễn Hương tốt nghiệp xuất sắc khóa đào tạo Chỉnh nha tại Hàn Quốc và có nhiều năm nghiên cứu sâu về cơ học chỉnh răng. Bác sĩ nổi tiếng với khả năng lập phác đồ di chuyển răng tối ưu, an toàn, không đau và rút ngắn thời gian niềng lên tới 6 tháng.',
      education: [
        'Thạc sĩ Chỉnh nha chuyên sâu, Đại học Nha khoa Quốc gia Seoul (Hàn Quốc)',
        'Chứng chỉ Chỉnh nha tăng trưởng chuyên sâu Biomechanics, ĐH Sydney (Úc)',
        'Chứng chỉ chuyên gia Invisalign toàn cầu cấp bởi Align Technology (Hoa Kỳ)'
      ],
      clinicalStrengths: [
        'Chỉnh nha chuyên sâu Invisalign (Niềng răng trong suốt) độ khó cao',
        'Chỉnh nha mắc cài tự buộc kết hợp minivis giải quyết hô/móm nặng không phẫu thuật',
        'Chỉnh nha tăng trưởng cho trẻ em từ sớm giúp định hình xương hàm cân đối'
      ],
      certifications: [
        'Hội viên danh dự Hội Chỉnh nha Thế giới (WFO)',
        'Bác sĩ hạng Diamond Provider của Invisalign toàn cầu',
        'Thành viên Hiệp hội Chỉnh nha Không mắc cài Châu Âu (EAS)'
      ],
      workHistory: [
        { periodText: '2016 - 2019', description: 'Bác sĩ Chỉnh nha tại Bệnh viện Nha khoa Đại học Quốc gia Seoul (Hàn Quốc)' },
        { periodText: '2019 - 2022', description: 'Chuyên gia chỉnh nha cấp cao tại Trung tâm Chỉnh nha Chuyên sâu GoodDental' },
        { periodText: '2022 - Nay', description: 'Cố vấn Chỉnh Nha & Chỉnh hình Răng Mặt tại Hệ thống Nha khoa GoodSmile' }
      ]
    }
  ];

  for (const d of dentists) {
    const user = await prisma.user.create({
      data: {
        roleId: roleDentist!.roleId,
        email: d.email,
        passwordHash: '$2b$10$AGg5dmxgt19uWEeL.RgSKOUBA1XHNUSz7yu3wRc6iwo9vxzEiktiW',
        fullName: d.name,
        status: 'Active',
      }
    });

    const dentist = await prisma.dentist.create({
      data: {
        userId: user.userId,
        specialty: d.specialty,
        degree: d.degree,
        experienceYears: d.experience,
        casesHandled: d.cases,
        motto: d.motto,
        bio: d.bio,
        defaultRoomId: roomMap[d.room],
        isActive: true,
      }
    });

    // Seed education
    for (let i = 0; i < d.education.length; i++) {
      await prisma.dentistEducation.create({
        data: {
          dentistId: dentist.dentistId,
          description: d.education[i],
          sortOrder: i,
        }
      });
    }

    // Seed clinical strengths
    for (let i = 0; i < d.clinicalStrengths.length; i++) {
      await prisma.dentistClinicalStrength.create({
        data: {
          dentistId: dentist.dentistId,
          description: d.clinicalStrengths[i],
          sortOrder: i,
        }
      });
    }

    // Seed certifications
    for (let i = 0; i < d.certifications.length; i++) {
      await prisma.dentistCertification.create({
        data: {
          dentistId: dentist.dentistId,
          description: d.certifications[i],
          sortOrder: i,
        }
      });
    }

    // Seed work history
    for (let i = 0; i < d.workHistory.length; i++) {
      await prisma.dentistWorkHistory.create({
        data: {
          dentistId: dentist.dentistId,
          periodText: d.workHistory[i].periodText,
          description: d.workHistory[i].description,
          sortOrder: i,
        }
      });
    }

    // Seed thêm ca trực trong 10 ngày (từ 3 ngày trước đến 7 ngày tới) cho bác sĩ để hiển thị lịch làm việc đầy đủ
    for (let offset = -3; offset <= 7; offset++) {
      const tempDate = new Date();
      tempDate.setDate(tempDate.getDate() + offset);
      const year = tempDate.getFullYear();
      const month = tempDate.getMonth();
      const day = tempDate.getDate();
      const workDateNormalized = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));

      const randomVal = (Number(dentist.dentistId) + offset) % 3;
      const shiftTypes: ('Morning' | 'Afternoon' | 'Full')[] = [];
      if (randomVal === 0) {
        shiftTypes.push('Morning');
      } else if (randomVal === 1) {
        shiftTypes.push('Afternoon');
      } else {
        shiftTypes.push('Morning', 'Afternoon');
      }

      for (const shiftType of shiftTypes) {
        await prisma.dentistShift.create({
          data: {
            dentistId: dentist.dentistId,
            roomId: roomMap[d.room],
            workDate: workDateNormalized,
            shiftType,
            startTime: shiftType === 'Morning' ? new Date('1970-01-01T08:00:00Z') : new Date('1970-01-01T14:00:00Z'),
            endTime: shiftType === 'Morning' ? new Date('1970-01-01T14:00:00Z') : new Date('1970-01-01T20:00:00Z'),
            isActive: true,
          }
        });
      }
    }
  }

  // 7.3 Tạo Bệnh nhân mặc định
  const mockPatients = [
    { id: 9902, name: 'Nguyễn Thị Lan', phone: '0901222333', criticalAllergy: 'Penicillin', condition: 'Đái tháo đường Tuýp 2', balance: 0, tier: 'standard', points: 300 },
    { id: 8821, name: 'Trần Nguyễn Minh', phone: '0901234567', criticalAllergy: 'Không', condition: 'Nhạy cảm ngà', balance: 4250000, tier: 'platinum', points: 8750 },
    { id: 12, name: 'Nguyễn Văn A', phone: '0912345678', criticalAllergy: 'Không', condition: 'Bình thường', balance: 1000000, tier: 'gold', points: 3200 },
    { id: 4490, name: 'Trần Thị B', phone: '0987654321', criticalAllergy: 'Aspirin', condition: 'Huyết áp thấp', balance: 500000, tier: 'standard', points: 1200 },
  ];

  for (const p of mockPatients) {
    const user = await prisma.user.create({
      data: {
        roleId: rolePatient!.roleId,
        fullName: p.name,
        phone: p.phone,
        email: p.phone === '0901234567' ? 'benhnhan@goodsmile.vn' : null,
        passwordHash: '$2b$10$AGg5dmxgt19uWEeL.RgSKOUBA1XHNUSz7yu3wRc6iwo9vxzEiktiW', // mật khẩu: 12345678
        status: 'Active',
      }
    });

    await prisma.patient.create({
      data: {
        patientId: p.id,
        userId: user.userId,
        fullName: p.name,
        phone: p.phone,
        criticalAllergy: p.criticalAllergy,
        medicalCondition: p.condition,
        walletBalance: p.balance,
        loyaltyPoints: p.points,
        tierId: tierMap[p.tier] || tierMap['standard'],
        isLocked: false,
      }
    });
  }

  // 7.4 Reset sequence của bảng patients tránh xung đột khóa chính do gán ID cứng
  console.log('🔄 Đang khởi tạo lại sequence bảng patients...');
  await prisma.$executeRawUnsafe(`
    ALTER SEQUENCE patients_patient_id_seq RESTART WITH 10000;
  `);

  // 7.5 SEED CA TRỰC BÁC SĨ (7 ngày tới)
  console.log('📆 Đang tạo ca trực bác sĩ (7 ngày tới)...');
  const allDentists = await prisma.dentist.findMany({ include: { user: true } });
  const allRooms = await prisma.room.findMany();
  const shiftConfigs: Array<{ shiftType: 'Morning' | 'Afternoon' | 'Full'; start: string; end: string }> = [
    { shiftType: 'Morning', start: '08:00', end: '14:00' },
    { shiftType: 'Afternoon', start: '14:00', end: '20:00' },
  ];
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

    for (let i = 0; i < allDentists.length; i++) {
      const dentist = allDentists[i];
      const room = allRooms[i % allRooms.length]; // Round-robin phòng
      for (const sc of shiftConfigs) {
        await prisma.dentistShift.upsert({
          where: {
            dentistId_workDate_shiftType: {
              dentistId: dentist.dentistId,
              workDate: new Date(`${dateStr}T00:00:00.000Z`),
              shiftType: sc.shiftType,
            },
          },
          update: {
            roomId: room.roomId,
            startTime: new Date(`1970-01-01T${sc.start}:00.000Z`),
            endTime: new Date(`1970-01-01T${sc.end}:00.000Z`),
            isActive: true,
          },
          create: {
            dentistId: dentist.dentistId,
            roomId: room.roomId,
            workDate: new Date(`${dateStr}T00:00:00.000Z`),
            shiftType: sc.shiftType,
            startTime: new Date(`1970-01-01T${sc.start}:00.000Z`),
            endTime: new Date(`1970-01-01T${sc.end}:00.000Z`),
            isActive: true,
          },
        });
      }
    }
  }
  console.log('✅ Tạo ca trực bác sĩ thành công!');

  // 8. SEED MOCK TODAY APPOINTMENT FOR TESTING CHECK-IN
  console.log('📅 Tạo lịch hẹn mặc định cho Trần Nguyễn Minh hôm nay...');
  const patientMinh = await prisma.patient.findFirst({ where: { phone: '0901234567' } });
  const dentistHuong = await prisma.dentist.findFirst({ where: { user: { email: 'nguyenhuong@goodsmile.vn' } } });
  const serviceKham = await prisma.service.findFirst({ where: { name: 'Khám răng tổng quát & Lập kế hoạch điều trị' } });
  const room110 = await prisma.room.findFirst({ where: { name: 'Phòng 110' } });

  if (patientMinh && dentistHuong && serviceKham && room110) {
    await prisma.appointment.create({
      data: {
        patientId: patientMinh.patientId,
        dentistId: dentistHuong.dentistId,
        serviceId: serviceKham.serviceId,
        roomId: room110.roomId,
        startTime: new Date(`${new Date().toISOString().split('T')[0]}T04:00:00.000Z`), // 11:00 AM local (UTC+7)
        endTime: new Date(`${new Date().toISOString().split('T')[0]}T04:20:00.000Z`),
        status: 'Confirmed',
        bookingChannel: 'Online'
      }
    });
  }

  console.log('✅ Seed Database hoàn tất thành công!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi chạy Seed Database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
