import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';

const router = Router();

/** Hàm helper tính tuổi từ ngày sinh */
function calcAge(dateOfBirth: Date): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

// ─── GET /api/patients ─────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.patient.findMany({
      include: { tier: true },
      orderBy: { fullName: 'asc' },
    });
    const formatted = list.map(p => ({
      id: `P-${p.patientId}`,
      name: p.fullName,
      phone: p.phone,
      age: p.dateOfBirth ? calcAge(p.dateOfBirth) : null,
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().split('T')[0] : null,
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

// ─── GET /api/patients/lookup (tra cứu theo SĐT – không cần JWT) ──────────────
router.get('/lookup', async (req: Request, res: Response, next: NextFunction) => {
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

// ─── POST /api/patients ────────────────────────────────────────────────────────
router.post('/', authGuard, requireRole('receptionist', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, dateOfBirth, gender, criticalAllergy, condition, address } = req.body;
    const normalizedPhone = String(phone || '').trim().replace(/[\s-]/g, '');

    if (!name || !normalizedPhone) {
      throw new AppError(400, 'Họ tên và số điện thoại là bắt buộc.', 'VALIDATION_ERROR');
    }
    if (!/^[0-9]{10,11}$/.test(normalizedPhone)) {
      throw new AppError(400, 'Số điện thoại không hợp lệ.', 'VALIDATION_ERROR');
    }

    const existing = await prisma.patient.findUnique({ where: { phone: normalizedPhone } });
    if (existing) {
      throw new AppError(409, 'Số điện thoại này đã có hồ sơ bệnh nhân.', 'PATIENT_ALREADY_EXISTS');
    }

    const tier = await prisma.membershipTier.findUnique({ where: { code: 'STANDARD' } });
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
      include: { tier: true },
    });

    return res.status(201).json({
      success: true,
      message: 'Tạo hồ sơ bệnh nhân thành công.',
      data: {
        id: `P-${patient.patientId}`,
        name: patient.fullName,
        phone: patient.phone,
        age: patient.dateOfBirth ? calcAge(patient.dateOfBirth) : null,
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

// ─── PATCH /api/patients/:id ───────────────────────────────────────────────────
router.patch('/:id', authGuard, requireRole('receptionist', 'manager', 'dentist'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = BigInt(req.params.id.replace('P-', ''));
    const { name, phone, criticalAllergy, condition, gender, dateOfBirth, address } = req.body;

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
    if (address !== undefined) updateData.address = address !== null ? String(address).trim() : null;
    if (dateOfBirth !== undefined) {
      if (!dateOfBirth) {
        updateData.dateOfBirth = null;
      } else if (typeof dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
        updateData.dateOfBirth = new Date(`${dateOfBirth}T00:00:00.000Z`);
      }
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
        dateOfBirth: updated.dateOfBirth ? updated.dateOfBirth.toISOString().split('T')[0] : null,
        address: updated.address || '',
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/patients/:id/lock ─────────────────────────────────────────────
router.patch('/:id/lock', authGuard, requireRole('receptionist', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = BigInt(req.params.id.replace('P-', ''));
    const { reason } = req.body;

    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (!existing) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân.', 'PATIENT_NOT_FOUND');
    }

    await prisma.patient.update({
      where: { patientId },
      data: { isLocked: true, lockedReason: reason || 'Bị khóa bởi nhân viên.' },
    });

    return res.status(200).json({ success: true, message: 'Khóa tài khoản bệnh nhân thành công.' });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/patients/:id/unlock ───────────────────────────────────────────
router.patch('/:id/unlock', authGuard, requireRole('receptionist', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patientId = BigInt(req.params.id.replace('P-', ''));

    const existing = await prisma.patient.findUnique({ where: { patientId } });
    if (!existing) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bệnh nhân.', 'PATIENT_NOT_FOUND');
    }

    await prisma.patient.update({
      where: { patientId },
      data: { isLocked: false, lockedReason: null },
    });

    return res.status(200).json({ success: true, message: 'Mở khóa tài khoản bệnh nhân thành công.' });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/patients/tiers ──────────────────────────────────────────────────
router.get('/tiers', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tiers = await prisma.membershipTier.findMany({
      orderBy: { minPoints: 'asc' },
    });
    return res.status(200).json({ success: true, data: tiers });
  } catch (err) { return next(err); }
});

// ─── PATCH /api/patients/tiers/:id ───────────────────────────────────────────
router.patch('/tiers/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tierId = parseInt(req.params.id);
    if (isNaN(tierId)) throw new AppError(400, 'ID hạng không hợp lệ.', 'VALIDATION_ERROR');

    const { discountPercent, minPoints, name } = req.body;
    const data: { discountPercent?: number; minPoints?: number; name?: string } = {};
    if (discountPercent !== undefined) data.discountPercent = Number(discountPercent);
    if (minPoints !== undefined) data.minPoints = Number(minPoints);
    if (name !== undefined) data.name = String(name).trim();

    const tier = await prisma.membershipTier.update({
      where: { tierId },
      data,
    });
    return res.status(200).json({ success: true, data: tier });
  } catch (err) { return next(err); }
});

export default router;

