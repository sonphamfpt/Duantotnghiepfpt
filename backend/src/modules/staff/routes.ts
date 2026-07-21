import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';
import { socketManager } from '../../config/socket';

const router = Router();

// ─── GET /api/staff ────────────────────────────────────────────────────────────
router.get('/', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.user.findMany({
      where: {
        role: { code: { in: ['dentist', 'receptionist', 'cashier', 'manager'] } },
      },
      include: { role: true, staffPermission: true },
      orderBy: { userId: 'asc' },
    });

    const dentists = await prisma.dentist.findMany({ select: { dentistId: true, userId: true } });
    const dentistMap = new Map(dentists.map(d => [d.userId.toString(), d.dentistId.toString()]));

    const formatted = list.map(u => ({
      id: `STF-${u.userId.toString().padStart(3, '0')}`,
      dentistId: dentistMap.get(u.userId.toString()) ? `D-${dentistMap.get(u.userId.toString())!.padStart(2, '0')}` : undefined,
      name: u.fullName,
      role: u.role.code,
      roleName: u.role.name,
      phone: u.phone || '',
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

// ─── POST /api/staff ───────────────────────────────────────────────────────────
router.post('/', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, role, phone, email, password } = req.body;
    if (!name || !role || !phone || !password) {
      throw new AppError(400, 'Tên, Vai trò, Số điện thoại và Mật khẩu là bắt buộc.', 'VALIDATION_ERROR');
    }

    const cleanPhone = String(phone).trim();

    const existingUser = await prisma.user.findFirst({ where: { phone: cleanPhone } });
    if (existingUser) {
      throw new AppError(409, 'Số điện thoại này đã được đăng ký tài khoản khác trong hệ thống.', 'USER_ALREADY_EXISTS');
    }

    const roleRecord = await prisma.role.findUnique({ where: { code: role } });
    if (!roleRecord) {
      throw new AppError(400, 'Vai trò không hợp lệ.', 'INVALID_ROLE');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          fullName: name.trim(),
          phone: cleanPhone,
          email: email ? String(email).trim() : null,
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
        role,
        email: newUser.email,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/staff/:id/permissions ─────────────────────────────────────────
router.patch('/:id/permissions', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parts = req.params.id.split('-');
    const userIdNum = BigInt(parts[1] || parts[0]);
    const { key } = req.body;

    const permission = await prisma.staffPermission.findUnique({ where: { userId: userIdNum } });
    const currentVal = permission ? (permission as Record<string, unknown>)[key] : false;

    const updated = await prisma.staffPermission.upsert({
      where: { userId: userIdNum },
      create: {
        userId: userIdNum,
        admission: key === 'admission',
        clinical: key === 'clinical',
        checkout: key === 'checkout',
        settings: key === 'settings',
      },
      update: { [key]: !currentVal },
    });

    // Phát event WebSocket cập nhật quyền real-time
    socketManager.emit('staff:permission_changed', {
      userId: userIdNum.toString(),
      permissions: {
        admission: updated.admission,
        clinical: updated.clinical,
        checkout: updated.checkout,
        settings: updated.settings,
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật phân quyền thành công.',
      data: {
        userId: updated.userId.toString(),
        admission: updated.admission,
        clinical: updated.clinical,
        checkout: updated.checkout,
        settings: updated.settings,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/staff/:id/status ──────────────────────────────────────────────
router.patch('/:id/status', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parts = req.params.id.split('-');
    const userIdNum = BigInt(parts[1] || parts[0]);

    const userRecord = await prisma.user.findUnique({ where: { userId: userIdNum } });
    if (!userRecord) {
      throw new AppError(404, 'Không tìm thấy tài khoản nhân viên.', 'NOT_FOUND');
    }

    const nextStatus = userRecord.status === 'Active' ? 'Inactive' : 'Active';
    const updated = await prisma.user.update({
      where: { userId: userIdNum },
      data: { status: nextStatus },
    });

    // Phát event WebSocket Kickout real-time nếu trạng thái chuyển sang Inactive
    socketManager.emit('staff:status_changed', {
      userId: userIdNum.toString(),
      status: updated.status,
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái nhân viên thành công.',
      data: { id: req.params.id, status: updated.status },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
