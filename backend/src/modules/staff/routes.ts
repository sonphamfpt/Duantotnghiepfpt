import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { RoleCode } from '@prisma/client';
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
        isDeleted: false,
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

    // 1. Kiểm tra trùng SĐT trong bảng User (Tài khoản nhân sự/quản lý khác)
    const dupUserPhone = await prisma.user.findFirst({ where: { phone: cleanPhone } });
    if (dupUserPhone) {
      throw new AppError(400, 'Số điện thoại này đã được đăng ký cho một tài khoản nhân sự khác trong CSDL.', 'PHONE_EXISTS');
    }

    // 2. Kiểm tra trùng SĐT trong bảng Patient (Tài khoản bệnh nhân)
    const dupPatientPhone = await prisma.patient.findFirst({
      where: { user: { phone: cleanPhone } },
      include: { user: true },
    });
    if (dupPatientPhone) {
      throw new AppError(400, `Số điện thoại này đã trùng với Bệnh nhân "${dupPatientPhone.user.fullName}" trong CSDL. Vui lòng sử dụng số khác.`, 'PHONE_EXISTS_PATIENT');
    }

    // 3. Kiểm tra trùng Email nếu có nhập
    if (email && String(email).trim()) {
      const cleanEmail = String(email).trim().toLowerCase();
      const dupUserEmail = await prisma.user.findFirst({ where: { email: cleanEmail } });
      if (dupUserEmail) {
        throw new AppError(400, 'Email này đã trùng với một tài khoản khác trong CSDL.', 'EMAIL_EXISTS');
      }
    }

    const targetRoleCode = Object.values(RoleCode).find(r => r.toLowerCase() === String(role).toLowerCase());
    if (!targetRoleCode) {
      throw new AppError(400, 'Vai trò không hợp lệ.', 'INVALID_ROLE');
    }

    const roleRecord = await prisma.role.findUnique({ where: { code: targetRoleCode } });
    if (!roleRecord) {
      throw new AppError(400, 'Vai trò không tồn tại trong hệ thống.', 'INVALID_ROLE');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          fullName: name.trim(),
          phone: cleanPhone,
          email: email ? String(email).trim().toLowerCase() : null,
          passwordHash,
          roleId: roleRecord.roleId,
          status: 'Active',
          avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&h=150&q=80',
        },
      });

      const isManager = targetRoleCode === RoleCode.manager;
      const isReceptionist = targetRoleCode === RoleCode.receptionist;
      const isDentist = targetRoleCode === RoleCode.dentist;
      const isCashier = targetRoleCode === RoleCode.cashier;

      await tx.staffPermission.create({
        data: {
          userId: u.userId,
          admission: isReceptionist || isManager,
          clinical: isDentist || isManager,
          checkout: isCashier || isManager,
          settings: isManager,
        },
      });

      if (isDentist) {
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

// ─── PUT /api/staff/:id ────────────────────────────────────────────────────────
router.put('/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parts = req.params.id.split('-');
    const userIdNum = BigInt(parts[1] || parts[0]);
    const { name, role, phone, email, password } = req.body;

    const userRecord = await prisma.user.findUnique({ where: { userId: userIdNum } });
    if (!userRecord) {
      throw new AppError(404, 'Không tìm thấy tài khoản nhân viên.', 'NOT_FOUND');
    }

    const updateData: any = {};
    if (name) updateData.fullName = String(name).trim();

    // 1. Kiểm tra trùng SĐT trong bảng User và Patient
    if (phone) {
      const cleanPhone = String(phone).trim();
      if (cleanPhone !== userRecord.phone) {
        const dupUser = await prisma.user.findFirst({
          where: { phone: cleanPhone, userId: { not: userIdNum } }
        });
        if (dupUser) {
          throw new AppError(400, 'Số điện thoại này đã trùng với một tài khoản nhân viên khác.', 'PHONE_EXISTS');
        }
        const dupPatient = await prisma.patient.findFirst({
          where: { user: { phone: cleanPhone } },
          include: { user: true },
        });
        if (dupPatient) {
          throw new AppError(400, `Số điện thoại này đã trùng với Bệnh nhân "${dupPatient.user.fullName}" trong CSDL. Vui lòng chọn số khác.`, 'PHONE_EXISTS_PATIENT');
        }
        updateData.phone = cleanPhone;
      }
    }

    // 2. Kiểm tra trùng Email trong bảng User
    if (email !== undefined && email) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (cleanEmail !== userRecord.email) {
        const dupEmail = await prisma.user.findFirst({
          where: { email: cleanEmail, userId: { not: userIdNum } }
        });
        if (dupEmail) {
          throw new AppError(400, 'Email này đã trùng với một tài khoản khác trong CSDL.', 'EMAIL_EXISTS');
        }
        updateData.email = cleanEmail;
      }
    } else if (email === '') {
      updateData.email = null;
    }

    // 3. Mã hóa mật khẩu mới nếu có nhập
    if (password && String(password).trim()) {
      updateData.passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    // 4. Cập nhật Vai trò & Phân quyền tương ứng (Mỗi nhân viên 1 vai trò duy nhất, Quản lý/Admin giữ đủ quyền)
    if (role) {
      const targetRoleCode = Object.values(RoleCode).find(r => r.toLowerCase() === String(role).toLowerCase());
      if (targetRoleCode) {
        const roleRecord = await prisma.role.findUnique({
          where: { code: targetRoleCode }
        });

        if (roleRecord) {
          updateData.roleId = roleRecord.roleId;

          const isManager = targetRoleCode === RoleCode.manager;
          const isReceptionist = targetRoleCode === RoleCode.receptionist;
          const isDentist = targetRoleCode === RoleCode.dentist;
          const isCashier = targetRoleCode === RoleCode.cashier;

          await prisma.staffPermission.upsert({
            where: { userId: userIdNum },
            create: {
              userId: userIdNum,
              admission: isReceptionist || isManager,
              clinical: isDentist || isManager,
              checkout: isCashier || isManager,
              settings: isManager,
            },
            update: {
              admission: isReceptionist || isManager,
              clinical: isDentist || isManager,
              checkout: isCashier || isManager,
              settings: isManager,
            },
          });

          if (isDentist) {
            const existingDentist = await prisma.dentist.findUnique({ where: { userId: userIdNum } });
            if (!existingDentist) {
              await prisma.dentist.create({
                data: {
                  userId: userIdNum,
                  specialty: 'Răng Hàm Mặt',
                  degree: 'Bác sĩ',
                  experienceYears: 5,
                },
              });
            }
          }
        }
      }
    }

    // 5. Lưu vào CSDL an toàn với khối try/catch lỗi Prisma
    try {
      await prisma.user.update({
        where: { userId: userIdNum },
        data: updateData,
      });
    } catch (dbErr: any) {
      console.error('Lỗi khi cập nhật User:', dbErr);
      if (dbErr.code === 'P2002') {
        const target = dbErr.meta?.target;
        if (Array.isArray(target) && target.includes('email')) {
          throw new AppError(400, 'Email này đã trùng với một tài khoản khác trong hệ thống.', 'EMAIL_EXISTS');
        }
        if (Array.isArray(target) && target.includes('phone')) {
          throw new AppError(400, 'Số điện thoại này đã trùng với một tài khoản khác trong hệ thống.', 'PHONE_EXISTS');
        }
        throw new AppError(400, 'Dữ liệu cập nhật trùng lặp với tài khoản khác trong hệ thống.', 'DUPLICATE_DATA');
      }
      throw new AppError(400, `Không thể lưu thay đổi: ${dbErr.message || 'Lỗi cơ sở dữ liệu.'}`, 'UPDATE_FAILED');
    }

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin nhân viên thành công.',
    });
  } catch (err) {
    return next(err);
  }
});

// ─── DELETE /api/staff/:id ─────────────────────────────────────────────────────
router.delete('/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parts = req.params.id.split('-');
    const userIdNum = BigInt(parts[1] || parts[0]);

    const userRecord = await prisma.user.findUnique({
      where: { userId: userIdNum },
      include: { role: true },
    });

    if (!userRecord) {
      throw new AppError(404, 'Không tìm thấy tài khoản nhân viên.', 'NOT_FOUND');
    }

    if (userRecord.role?.code === 'manager' || (userRecord.role?.code as string) === 'MANAGER') {
      throw new AppError(400, 'Không thể xóa tài khoản Quản trị viên tối cao của hệ thống.', 'FORBIDDEN');
    }

    // Thực hiện Xóa Mềm (Soft Delete): Đánh dấu isDeleted: true và status: Inactive
    await prisma.user.update({
      where: { userId: userIdNum },
      data: {
        isDeleted: true,
        status: 'Inactive',
      } as any,
    });

    return res.status(200).json({
      success: true,
      message: 'Đã xóa mềm tài khoản nhân sự thành công. Nhân viên này đã bị ẩn khỏi giao diện và lịch làm việc.',
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
