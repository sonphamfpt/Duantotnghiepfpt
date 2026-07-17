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
import { env } from './config/env';

const app = express();

// 1. Bảo mật và Cấu hình CORS
app.use(helmet());
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
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
      age: p.dateOfBirth ? (() => { const dob = new Date(p.dateOfBirth!); const today = new Date(); let age = today.getFullYear() - dob.getFullYear(); const m = today.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--; return age; })() : null,
      gender: p.gender || null,
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
        gender: patient.gender || null,
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
        age: patient.dateOfBirth ? (() => { const dob = new Date(patient.dateOfBirth!); const today = new Date(); let age = today.getFullYear() - dob.getFullYear(); const m = today.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--; return age; })() : null,
        gender: patient.gender || null,
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

// ─── Cập nhật thông tin bệnh nhân (lễ tân / quản lý) ─────────────────────────
app.patch('/api/patients/:id', authGuard, requireRole('receptionist', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawId = id.replace('P-', '');
    const patientId = BigInt(rawId);

    const { name, phone, criticalAllergy, condition, gender, age } = req.body;

    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (!existing) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân.', 'PATIENT_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.fullName = String(name).trim();
    if (phone !== undefined) updateData.phone = String(phone).trim().replace(/[\s-]/g, '');
    if (criticalAllergy !== undefined) updateData.criticalAllergy = criticalAllergy;
    if (condition !== undefined) updateData.medicalCondition = condition;
    if (gender !== undefined) updateData.gender = gender;
    if (age !== undefined && typeof age === 'number' && age > 0) {
      // Tính năm sinh từ tuổi (gần đúng)
      const birthYear = new Date().getFullYear() - age;
      updateData.dateOfBirth = new Date(`${birthYear}-01-01T00:00:00.000Z`);
    }

    const updated = await prisma.patient.update({
      where: { patientId },
      data: updateData,
      include: { tier: true },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin bệnh nhân thành công.',
      data: {
        id: `P-${updated.patientId}`,
        name: updated.fullName,
        phone: updated.phone,
        criticalAllergy: updated.criticalAllergy || 'Không',
        condition: updated.medicalCondition || 'Bình thường',
        gender: updated.gender || null,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── Khóa tài khoản bệnh nhân ────────────────────────────────────────────────
app.patch('/api/patients/:id/lock', authGuard, requireRole('receptionist', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawId = id.replace('P-', '');
    const patientId = BigInt(rawId);

    const { reason } = req.body;

    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (!existing) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân.', 'PATIENT_NOT_FOUND');
    }

    await prisma.patient.update({
      where: { patientId },
      data: {
        isLocked: true,
        lockedReason: reason || 'Bị khóa bởi nhân viên.',
      },
    });

    return res.status(200).json({ success: true, message: 'Khóa tài khoản bệnh nhân thành công.' });
  } catch (err) {
    return next(err);
  }
});

// ─── Mở khóa tài khoản bệnh nhân ─────────────────────────────────────────────
app.patch('/api/patients/:id/unlock', authGuard, requireRole('receptionist', 'manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const rawId = id.replace('P-', '');
    const patientId = BigInt(rawId);

    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (!existing) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân.', 'PATIENT_NOT_FOUND');
    }

    await prisma.patient.update({
      where: { patientId },
      data: {
        isLocked: false,
        lockedReason: null,
      },
    });

    return res.status(200).json({ success: true, message: 'Mở khóa tài khoản bệnh nhân thành công.' });
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

// 4.2. REST APIs Quản lý nhân viên (RBAC) cho Manager Console
app.get('/api/staff', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const list = await prisma.user.findMany({
      where: {
        role: {
          code: {
            in: ['dentist', 'receptionist', 'cashier', 'manager'],
          },
        },
      },
      include: {
        role: true,
        staffPermission: true,
      },
      orderBy: {
        userId: 'asc',
      },
    });

    const formatted = list.map(u => ({
      id: `STF-${u.userId.toString().padStart(3, '0')}`,
      name: u.fullName,
      role: u.role.code,
      roleName: u.role.name,
      email: u.email || '',
      avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80',
      status: u.status,
      permissions: {
        admission: u.staffPermission?.admission || false,
        clinical: u.staffPermission?.clinical || false,
        checkout: u.staffPermission?.checkout || false,
        settings: u.staffPermission?.settings || false,
      },
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

app.post('/api/staff', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, role, email, password } = req.body;
    if (!name || !role || !email || !password) {
      throw new AppError(400, 'Tất cả các trường thông tin là bắt buộc.', 'VALIDATION_ERROR');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new AppError(409, 'Email này đã tồn tại trong hệ thống.', 'USER_ALREADY_EXISTS');
    }

    const roleRecord = await prisma.role.findUnique({
      where: { code: role },
    });
    if (!roleRecord) {
      throw new AppError(400, 'Vai trò không hợp lệ.', 'INVALID_ROLE');
    }

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          fullName: name,
          email,
          passwordHash,
          roleId: roleRecord.roleId,
          status: 'Active',
          avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80',
        },
      });

      const isManager = role === 'manager';
      await tx.staffPermission.create({
        data: {
          userId: u.userId,
          admission: role === 'receptionist' || isManager,
          clinical: role === 'dentist' || isManager,
          checkout: role === 'cashier' || isManager,
          settings: isManager,
        },
      });

      if (role === 'dentist') {
        await tx.dentist.create({
          data: {
            userId: u.userId,
            specialty: 'Răng Hàm Mặt',
            degree: 'Bác sĩ',
            experienceYears: 5,
          },
        });
      }

      return u;
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo tài khoản nhân viên thành công.',
      data: {
        id: `STF-${newUser.userId.toString().padStart(3, '0')}`,
        name: newUser.fullName,
        role: role,
        email: newUser.email,
      },
    });
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/staff/:id/permissions', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { key } = req.body;
    
    const parts = id.split('-');
    const userIdNum = BigInt(parts[1] || parts[0]);

    const permission = await prisma.staffPermission.findUnique({
      where: { userId: userIdNum },
    });

    if (!permission) {
      throw new AppError(404, 'Không tìm thấy bảng phân quyền của nhân viên này.', 'NOT_FOUND');
    }

    const currentVal = (permission as any)[key];
    const updated = await prisma.staffPermission.update({
      where: { userId: userIdNum },
      data: {
        [key]: !currentVal,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật phân quyền thành công.',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/staff/:id/status', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const parts = id.split('-');
    const userIdNum = BigInt(parts[1] || parts[0]);

    const userRecord = await prisma.user.findUnique({
      where: { userId: userIdNum },
    });

    if (!userRecord) {
      throw new AppError(404, 'Không tìm thấy tài khoản nhân viên.', 'NOT_FOUND');
    }

    const nextStatus = userRecord.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await prisma.user.update({
      where: { userId: userIdNum },
      data: {
        status: nextStatus,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái nhân viên thành công.',
      data: {
        id,
        status: updated.status,
      },
    });
  } catch (err) {
    return next(err);
  }
});

app.get('/api/logs', async (req, res, next) => {
  try {
    const list = await prisma.systemLog.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const pad = (n: number) => n.toString().padStart(2, '0');
    const formatTime = (d: Date): string => {
      const hh = pad(d.getHours());
      const mm = pad(d.getMinutes());
      const ss = pad(d.getSeconds());
      return `${hh}:${mm}:${ss}`;
    };

    const formatted = list.map(l => ({
      id: `L-${l.logId}`,
      time: formatTime(l.createdAt),
      module: l.module,
      type: l.logType,
      message: l.message,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

// ─── Cập nhật phòng trực cho ca trực ─────────────────────────────────────────
app.patch('/api/shifts/:id/room', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const parts = id.split('-');
    const shiftIdNum = BigInt(parts[1] || parts[0]);

    const { roomId } = req.body;
    if (!roomId) {
      throw new AppError(400, 'Thiếu thông tin phòng khám.', 'VALIDATION_ERROR');
    }

    const shift = await prisma.dentistShift.findUnique({ where: { shiftId: shiftIdNum } });
    if (!shift) {
      throw new AppError(404, 'Không tìm thấy ca trực.', 'SHIFT_NOT_FOUND');
    }

    const updated = await prisma.dentistShift.update({
      where: { shiftId: shiftIdNum },
      data: { roomId: Number(roomId) },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật phòng trực thành công.',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
});

app.delete('/api/shifts/:id', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const parts = id.split('-');
    const shiftIdNum = BigInt(parts[1] || parts[0]);

    await prisma.dentistShift.delete({
      where: { shiftId: shiftIdNum },
    });

    return res.status(200).json({
      success: true,
      message: 'Xóa ca trực thành công.',
    });
  } catch (err) {
    return next(err);
  }
});

app.post('/api/services', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { name, price, durationMin } = req.body;
    if (!name || !price || !durationMin) {
      throw new AppError(400, 'Tất cả các thông tin là bắt buộc.', 'VALIDATION_ERROR');
    }

    const created = await prisma.service.create({
      data: {
        name,
        price: Number(price),
        durationMinutes: Number(durationMin),
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm dịch vụ mới thành công.',
      data: created,
    });
  } catch (err) {
    return next(err);
  }
});

app.put('/api/services/:id', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price } = req.body;
    const parts = id.split('-');
    const serviceIdNum = BigInt(parts[1] || parts[0]);

    const updated = await prisma.service.update({
      where: { serviceId: serviceIdNum },
      data: {
        price: Number(price),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật giá dịch vụ thành công.',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
});

app.patch('/api/services/:id/active', authGuard, requireRole('manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const parts = id.split('-');
    const serviceIdNum = BigInt(parts[1] || parts[0]);

    const service = await prisma.service.findUnique({
      where: { serviceId: serviceIdNum },
    });
    if (!service) {
      throw new AppError(404, 'Không tìm thấy dịch vụ.', 'NOT_FOUND');
    }

    const nextActive = !service.isActive;
    const updated = await prisma.service.update({
      where: { serviceId: serviceIdNum },
      data: {
        isActive: nextActive,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái dịch vụ thành công.',
      data: updated,
    });
  } catch (err) {
    return next(err);
  }
});

// 5. Middleware xử lý lỗi tập trung (bắt buộc đặt cuối cùng)
app.use(errorHandler);

export default app;
