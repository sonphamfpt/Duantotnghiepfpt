import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';

const router = Router();

// ─── GET /api/dentists ─────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.dentist.findMany({
      where: {
        user: { isDeleted: false }
      },
      include: {
        user: true,
        education: { orderBy: { sortOrder: 'asc' } },
        clinicalStrengths: { orderBy: { sortOrder: 'asc' } },
        certifications: { orderBy: { sortOrder: 'asc' } },
        workHistory: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { dentistId: 'asc' },
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
      status: d.user?.status || (d.isActive ? 'Active' : 'Inactive'),
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/dentists/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id.replace('D-', '');
    const dentistIdNum = BigInt(rawId);

    const d = await prisma.dentist.findUnique({
      where: { dentistId: dentistIdNum },
      include: {
        user: true,
        education: { orderBy: { sortOrder: 'asc' } },
        clinicalStrengths: { orderBy: { sortOrder: 'asc' } },
        certifications: { orderBy: { sortOrder: 'asc' } },
        workHistory: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!d) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bác sĩ.', 'NOT_FOUND');
    }

    const formatted = {
      id: `D-${d.dentistId.toString().padStart(2, '0')}`,
      userId: d.userId.toString(),
      name: d.user.fullName,
      role: 'Bác sĩ nha khoa',
      specialty: d.specialty || 'Nha sĩ',
      degree: d.degree || 'Bác sĩ',
      experienceYears: d.experienceYears || 5,
      bio: d.bio || '',
      motto: d.motto || '',
      casesHandled: d.casesHandled || '',
      avatar: d.user.avatarUrl || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=150&h=150&q=80',
      education: d.education.map(e => e.description),
      clinicalStrengths: d.clinicalStrengths.map(s => s.description),
      certifications: d.certifications.map(c => c.description),
      workHistory: d.workHistory.map(w => ({ periodText: w.periodText || '', description: w.description })),
    };

    return res.status(200).json({ success: true, data: formatted });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/dentists/:id (Chỉnh sửa hồ sơ Bác sĩ) ─────────────────────────
router.patch('/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id.replace('D-', '');
    const dentistIdNum = BigInt(rawId);

    const d = await prisma.dentist.findUnique({ where: { dentistId: dentistIdNum } });
    if (!d) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bác sĩ.', 'NOT_FOUND');
    }

    const {
      name,
      specialty,
      degree,
      experienceYears,
      casesHandled,
      motto,
      bio,
      education,
      certifications,
      clinicalStrengths,
      workHistory,
    } = req.body;

    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật họ tên trong bảng User
      if (name && typeof name === 'string') {
        await tx.user.update({
          where: { userId: d.userId },
          data: { fullName: name.trim() },
        });
      }

      // 2. Cập nhật thông tin trong bảng Dentist
      await tx.dentist.update({
        where: { dentistId: dentistIdNum },
        data: {
          ...(specialty !== undefined && { specialty: String(specialty).trim() }),
          ...(degree !== undefined && { degree: String(degree).trim() }),
          ...(experienceYears !== undefined && { experienceYears: Number(experienceYears) }),
          ...(casesHandled !== undefined && { casesHandled: String(casesHandled).trim() }),
          ...(motto !== undefined && { motto: String(motto).trim() }),
          ...(bio !== undefined && { bio: String(bio).trim() }),
        },
      });

      // 3. Cập nhật Học Vấn (dentist_education)
      if (Array.isArray(education)) {
        await tx.dentistEducation.deleteMany({ where: { dentistId: dentistIdNum } });
        if (education.length > 0) {
          await tx.dentistEducation.createMany({
            data: education.map((desc: string, i: number) => ({
              dentistId: dentistIdNum,
              description: String(desc).trim(),
              sortOrder: i,
            })),
          });
        }
      }

      // 4. Cập nhật Chứng Chỉ (dentist_certifications)
      if (Array.isArray(certifications)) {
        await tx.dentistCertification.deleteMany({ where: { dentistId: dentistIdNum } });
        if (certifications.length > 0) {
          await tx.dentistCertification.createMany({
            data: certifications.map((desc: string, i: number) => ({
              dentistId: dentistIdNum,
              description: String(desc).trim(),
              sortOrder: i,
            })),
          });
        }
      }

      // 5. Cập nhật Thế Mạnh Lâm Sàng (dentist_clinical_strengths)
      if (Array.isArray(clinicalStrengths)) {
        await tx.dentistClinicalStrength.deleteMany({ where: { dentistId: dentistIdNum } });
        if (clinicalStrengths.length > 0) {
          await tx.dentistClinicalStrength.createMany({
            data: clinicalStrengths.map((desc: string, i: number) => ({
              dentistId: dentistIdNum,
              description: String(desc).trim(),
              sortOrder: i,
            })),
          });
        }
      }

      // 6. Cập nhật Lịch Sử Công Tác (dentist_work_history)
      if (Array.isArray(workHistory)) {
        await tx.dentistWorkHistory.deleteMany({ where: { dentistId: dentistIdNum } });
        if (workHistory.length > 0) {
          await tx.dentistWorkHistory.createMany({
            data: workHistory.map((item: any, i: number) => {
              const periodText = typeof item === 'object' ? item.periodText || '' : '';
              const description = typeof item === 'object' ? item.description || '' : String(item);
              return {
                dentistId: dentistIdNum,
                periodText: String(periodText).trim(),
                description: String(description).trim(),
                sortOrder: i,
              };
            }),
          });
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật hồ sơ bác sĩ thành công!',
    });
  } catch (err) {
    return next(err);
  }
});

// ─── DELETE /api/dentists/:id (Xóa / Ngưng hoạt động Bác sĩ) ──────────────────
router.delete('/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id.replace('D-', '');
    const dentistIdNum = BigInt(rawId);

    const d = await prisma.dentist.findUnique({ where: { dentistId: dentistIdNum } });
    if (!d) {
      throw new AppError(404, 'Không tìm thấy hồ sơ bác sĩ.', 'NOT_FOUND');
    }

    await prisma.$transaction([
      prisma.dentist.update({ where: { dentistId: dentistIdNum }, data: { isActive: false } }),
      prisma.user.update({ where: { userId: d.userId }, data: { status: 'Inactive' } }),
    ]);

    const { socketManager } = require('../../config/socket');
    socketManager.emit('staff:status_changed', {
      userId: d.userId.toString(),
      status: 'Inactive',
    });

    return res.status(200).json({
      success: true,
      message: 'Đã ngưng hoạt động tài khoản bác sĩ thành công.',
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
