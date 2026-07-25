import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middlewares/errorHandler';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';

const router = Router();

// ─── GET /api/services ─────────────────────────────────────────────────────────
// Dùng cho trang public/booking: chỉ trả về dịch vụ đang hoạt động
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.service.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: { serviceId: 'asc' },
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

// ─── GET /api/services/all ─────────────────────────────────────────────────────
// Dùng cho trang quản lý (Manager Settings): trả về TẤT CẢ dịch vụ (bao gồm cả đã tắt)
router.get('/all', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await prisma.service.findMany({
      include: { category: true },
      orderBy: { serviceId: 'asc' },
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

// ─── POST /api/services ────────────────────────────────────────────────────────
router.post('/', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
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

// ─── PUT /api/services/:id ─────────────────────────────────────────────────────
router.put('/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parts = req.params.id.split('-');
    const serviceIdNum = BigInt(parts[1] || parts[0]);
    const { price } = req.body;

    const updated = await prisma.service.update({
      where: { serviceId: serviceIdNum },
      data: { price: Number(price) },
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

// ─── PATCH /api/services/:id/active ───────────────────────────────────────────
router.patch('/:id/active', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parts = req.params.id.split('-');
    const serviceIdNum = BigInt(parts[1] || parts[0]);

    const service = await prisma.service.findUnique({ where: { serviceId: serviceIdNum } });
    if (!service) {
      throw new AppError(404, 'Không tìm thấy dịch vụ.', 'NOT_FOUND');
    }

    const updated = await prisma.service.update({
      where: { serviceId: serviceIdNum },
      data: { isActive: !service.isActive },
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

export default router;
