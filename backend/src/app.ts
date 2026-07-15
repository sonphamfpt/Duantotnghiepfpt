import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import appointmentsRouter from './modules/appointments/routes';
import authRouter from './modules/auth/routes';
import queuesRouter from './modules/queues/router';
import medicalRecordsRouter from './modules/medical-records/router';
import invoicesRouter from './modules/invoices/routes';
import treatmentPlansRouter from './modules/treatment-plans/routes';
import shiftsRouter from './modules/shifts/routes';
import reportsRouter from './modules/reports/routes';
import { prisma } from './config/prisma';
import { AppError } from './middlewares/errorHandler';
import { errorHandler } from './middlewares/errorHandler';
import { authGuard } from './middlewares/authGuard';
import { requireRole } from './middlewares/roleGuard';

const app = express();

// 1. Bảo mật và Cấu hình CORS
app.use(helmet());
app.use(cors({
  origin: '*', // Hỗ trợ kết nối từ frontend React dev server
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-otp-token'],
}));

// 2. Chuyển đổi JSON Body đầu vào
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Đường dẫn gốc kiểm tra trạng thái hoạt động
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Chào mừng bạn đến với API quản lý phòng khám Nha khoa GoodSmile! 🦷',
    timestamp: new Date().toISOString(),
  });
});

// 4. Các Module Routes
app.use('/api/appointments', appointmentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/queues', queuesRouter);
app.use('/api/medical-records', medicalRecordsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/treatment-plans', treatmentPlansRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/reports', reportsRouter);

// 4.1. Các REST API Tiện ích cho Frontend
app.get('/api/patients', async (req, res, next) => {
  try {
    const list = await prisma.patient.findMany({
      include: {
        tier: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
    const formatted = list.map(p => ({
      id: `P-${p.patientId}`,
      name: p.fullName,
      phone: p.phone,
      age: p.dateOfBirth ? (new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()) : 30,
      gender: p.gender || 'Nam',
      criticalAllergy: p.criticalAllergy || 'Không',
      condition: p.medicalCondition || 'Bình thường',
      address: p.address || '',
      balance: Number(p.walletBalance),
      points: p.loyaltyPoints,
      tier: p.tier.name,
      isLocked: p.isLocked,
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

// Tra cứu bệnh nhân theo số điện thoại (không cần JWT — lễ tân tra nhanh khi check-in)
app.get('/api/patients/lookup', async (req, res, next) => {
  try {
    const phone = String(req.query.phone || '').trim().replace(/[\s-]/g, '');
    if (!phone) {
      return res.status(200).json({ success: true, data: { found: false } });
    }

    const patient = await prisma.patient.findUnique({
      where: { phone },
      select: {
        patientId: true,
        fullName: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        isLocked: true,
        userId: true,
      },
    });

    if (!patient) {
      return res.status(200).json({ success: true, data: { found: false } });
    }

    return res.status(200).json({
      success: true,
      data: {
        found: true,
        patientId: `P-${patient.patientId}`,
        fullName: patient.fullName,
        phone: patient.phone,
        gender: patient.gender || 'Nam',
        dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString().split('T')[0] : '',
        address: patient.address || '',
        isLocked: patient.isLocked,
        hasAccount: patient.userId !== null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

app.post('/api/patients', authGuard, requireRole('receptionist', 'manager'), async (req, res, next) => {
  try {
    const { name, phone, dateOfBirth, gender, criticalAllergy, condition, address } = req.body;
    const normalizedPhone = String(phone || '').trim().replace(/[\s-]/g, '');

    if (!name || !normalizedPhone) {
      throw new AppError(400, 'Họ tên và số điện thoại là bắt buộc.', 'VALIDATION_ERROR');
    }

    if (!/^[0-9]{10,11}$/.test(normalizedPhone)) {
      throw new AppError(400, 'Số điện thoại không hợp lệ.', 'VALIDATION_ERROR');
    }

    const existing = await prisma.patient.findUnique({
      where: { phone: normalizedPhone },
    });
    if (existing) {
      throw new AppError(409, 'Số điện thoại này đã có hồ sơ bệnh nhân.', 'PATIENT_ALREADY_EXISTS');
    }

    const tier = await prisma.membershipTier.findUnique({
      where: { code: 'STANDARD' },
    });
    if (!tier) {
      throw new AppError(500, 'Không tìm thấy phân hạng thành viên Standard.', 'TIER_NOT_FOUND');
    }

    const parsedDateOfBirth = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null;

    const patient = await prisma.patient.create({
      data: {
        fullName: String(name).trim(),
        phone: normalizedPhone,
        dateOfBirth: parsedDateOfBirth,
        gender: gender || null,
        criticalAllergy: criticalAllergy || 'Không',
        medicalCondition: condition || 'Bình thường',
        address: address ? String(address).trim() : null,
        tierId: tier.tierId,
      },
      include: {
        tier: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo hồ sơ bệnh nhân thành công.',
      data: {
        id: `P-${patient.patientId}`,
        name: patient.fullName,
        phone: patient.phone,
        age: patient.dateOfBirth ? (new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()) : 30,
        gender: patient.gender || 'Nam',
        criticalAllergy: patient.criticalAllergy || 'Không',
        condition: patient.medicalCondition || 'Bình thường',
        address: patient.address || '',
        balance: Number(patient.walletBalance),
        points: patient.loyaltyPoints,
        tier: patient.tier.name,
        isLocked: patient.isLocked,
      },
    });
  } catch (err) {
    return next(err);
  }
});

app.get('/api/dentists', async (req, res, next) => {
  try {
    const list = await prisma.dentist.findMany({
      include: {
        user: true,
        education: { orderBy: { sortOrder: 'asc' } },
        clinicalStrengths: { orderBy: { sortOrder: 'asc' } },
        certifications: { orderBy: { sortOrder: 'asc' } },
        workHistory: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: {
        dentistId: 'asc',
      },
    });
    const formatted = list.map(d => ({
      id: `D-${d.dentistId.toString().padStart(2, '0')}`,
      name: d.user.fullName,
      role: 'Bác sĩ nha khoa',
      specialty: d.specialty || 'Nha sĩ',
      degree: d.degree || 'Bác sĩ',
      experience: d.experienceYears || 5,
      bio: d.bio || 'Chuyên gia phục hình sứ thẩm mỹ.',
      motto: d.motto || 'Nụ cười của bạn là hạnh phúc của chúng tôi.',
      cases: d.casesHandled || '500+ ca',
      avatar: d.user.avatarUrl || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=150&h=150&q=80',
      education: d.education.map(e => e.description),
      clinicalStrengths: d.clinicalStrengths.map(s => s.description),
      certifications: d.certifications.map(c => c.description),
      workHistory: d.workHistory.map(w => w.periodText ? `${w.periodText}: ${w.description}` : w.description),
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

app.get('/api/services', async (req, res, next) => {
  try {
    const list = await prisma.service.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
      orderBy: {
        serviceId: 'asc',
      },
    });
    const formatted = list.map(s => ({
      id: `S-${s.serviceId.toString().padStart(2, '0')}`,
      name: s.name,
      price: Number(s.price),
      duration: `${s.durationMinutes} phút`,
      durationMin: s.durationMinutes,
      category: s.category?.name || 'Điều trị chung',
      isActive: s.isActive,
      description: s.description || 'Dịch vụ điều trị răng miệng chất lượng cao.',
    }));
    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

// 5. Middleware xử lý lỗi tập trung (bắt buộc đặt cuối cùng)
app.use(errorHandler);

export default app;
