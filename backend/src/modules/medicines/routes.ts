import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';

const router = Router();

// ─── GET /api/medicines ────────────────────────────────────────────────────────
// Lấy danh sách thuốc đang ACTIVE — dùng khi kê đơn
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const medicines = await prisma.medicine.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        medicineId: true,
        name: true,
        defaultDose: true,
        defaultDuration: true,
        defaultNote: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: medicines.map(m => ({
        id: `M-${m.medicineId}`,
        name: m.name,
        defaultDose: m.defaultDose || '',
        defaultDuration: m.defaultDuration || '',
        defaultNote: m.defaultNote || '',
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/medicines/all ────────────────────────────────────────────────────
// Toàn bộ danh sách (active + ẩn) — dùng cho trang quản lý thuốc của bác sĩ
router.get('/all', authGuard, requireRole('dentist', 'manager'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const medicines = await prisma.medicine.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: {
        createdBy: {
          select: { fullName: true },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: medicines.map(m => ({
        id: `M-${m.medicineId}`,
        name: m.name,
        defaultDose: m.defaultDose || '',
        defaultDuration: m.defaultDuration || '',
        defaultNote: m.defaultNote || '',
        isActive: m.isActive,
        createdBy: m.createdBy?.fullName || null,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/medicines ───────────────────────────────────────────────────────
// Thêm thuốc mới — Bác sĩ hoặc Manager
router.post('/', authGuard, requireRole('dentist', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, defaultDose, defaultDuration, defaultNote } = req.body;

    if (!name || !String(name).trim()) {
      throw new AppError(400, 'Tên thuốc là bắt buộc.', 'VALIDATION_ERROR');
    }

    const trimmedName = String(name).trim();

    // Kiểm tra trùng tên (kể cả đã ẩn)
    const existing = await prisma.medicine.findUnique({ where: { name: trimmedName } });
    if (existing) {
      if (!existing.isActive) {
        throw new AppError(409, `Thuốc "${trimmedName}" đã tồn tại nhưng đang bị ẩn. Hãy bật lại thay vì tạo mới.`, 'MEDICINE_HIDDEN');
      }
      throw new AppError(409, `Thuốc "${trimmedName}" đã tồn tại trong danh mục.`, 'MEDICINE_EXISTS');
    }

    const userId = req.user?.userId ? BigInt(req.user.userId) : null;

    const medicine = await prisma.medicine.create({
      data: {
        name: trimmedName,
        defaultDose: defaultDose ? String(defaultDose).trim() : null,
        defaultDuration: defaultDuration ? String(defaultDuration).trim() : null,
        defaultNote: defaultNote ? String(defaultNote).trim() : null,
        isActive: true,
        createdByUserId: userId,
      },
    });

    return res.status(201).json({
      success: true,
      message: `Đã thêm thuốc "${medicine.name}" vào danh mục.`,
      data: {
        id: `M-${medicine.medicineId}`,
        name: medicine.name,
        defaultDose: medicine.defaultDose || '',
        defaultDuration: medicine.defaultDuration || '',
        defaultNote: medicine.defaultNote || '',
        isActive: medicine.isActive,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/medicines/:id/toggle ──────────────────────────────────────────
// Bật/Tắt hiển thị thuốc — Bác sĩ hoặc Manager
router.patch('/:id/toggle', authGuard, requireRole('dentist', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id.replace('M-', '');
    const medicineId = BigInt(rawId);

    const medicine = await prisma.medicine.findUnique({ where: { medicineId } });
    if (!medicine) {
      throw new AppError(404, 'Không tìm thấy thuốc.', 'MEDICINE_NOT_FOUND');
    }

    const updated = await prisma.medicine.update({
      where: { medicineId },
      data: { isActive: !medicine.isActive },
    });

    const action = updated.isActive ? 'Hiện' : 'Ẩn';
    return res.status(200).json({
      success: true,
      message: `${action} thuốc "${updated.name}" thành công.`,
      data: {
        id: `M-${updated.medicineId}`,
        name: updated.name,
        isActive: updated.isActive,
      },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── PUT /api/medicines/:id ────────────────────────────────────────────────────
// Cập nhật thông tin thuốc — Bác sĩ hoặc Manager
router.put('/:id', authGuard, requireRole('dentist', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id.replace('M-', '');
    const medicineId = BigInt(rawId);
    const { name, defaultDose, defaultDuration, defaultNote } = req.body;

    const medicine = await prisma.medicine.findUnique({ where: { medicineId } });
    if (!medicine) {
      throw new AppError(404, 'Không tìm thấy thuốc.', 'MEDICINE_NOT_FOUND');
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) throw new AppError(400, 'Tên thuốc không được để trống.', 'VALIDATION_ERROR');
      // Kiểm tra trùng tên với thuốc khác
      const dup = await prisma.medicine.findFirst({ where: { name: trimmed, medicineId: { not: medicineId } } });
      if (dup) throw new AppError(409, `Thuốc "${trimmed}" đã tồn tại.`, 'MEDICINE_EXISTS');
      updateData.name = trimmed;
    }
    if (defaultDose !== undefined) updateData.defaultDose = defaultDose ? String(defaultDose).trim() : null;
    if (defaultDuration !== undefined) updateData.defaultDuration = defaultDuration ? String(defaultDuration).trim() : null;
    if (defaultNote !== undefined) updateData.defaultNote = defaultNote ? String(defaultNote).trim() : null;

    const updated = await prisma.medicine.update({ where: { medicineId }, data: updateData });

    return res.status(200).json({
      success: true,
      message: `Cập nhật thuốc "${updated.name}" thành công.`,
      data: {
        id: `M-${updated.medicineId}`,
        name: updated.name,
        defaultDose: updated.defaultDose || '',
        defaultDuration: updated.defaultDuration || '',
        defaultNote: updated.defaultNote || '',
        isActive: updated.isActive,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
