import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';
import { AppError } from '../../middlewares/errorHandler';

const router = Router();

// ─── GET /api/rooms ───────────────────────────────────────────────────────────
router.get('/', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: { roomId: 'asc' },
      select: { roomId: true, name: true, isActive: true },
    });
    return res.status(200).json({ success: true, data: rooms });
  } catch (err) { return next(err); }
});

// ─── POST /api/rooms ──────────────────────────────────────────────────────────
router.post('/', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name || String(name).trim() === '') {
      throw new AppError(400, 'Tên phòng là bắt buộc.', 'VALIDATION_ERROR');
    }
    const room = await prisma.room.create({
      data: { name: String(name).trim() },
      select: { roomId: true, name: true, isActive: true },
    });
    return res.status(201).json({ success: true, data: room });
  } catch (err) { return next(err); }
});

// ─── PATCH /api/rooms/:id ─────────────────────────────────────────────────────
router.patch('/:id', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roomId = parseInt(req.params.id);
    if (isNaN(roomId)) throw new AppError(400, 'ID phòng không hợp lệ.', 'VALIDATION_ERROR');

    const { name, isActive } = req.body;
    const data: { name?: string; isActive?: boolean } = {};
    if (name !== undefined) data.name = String(name).trim();
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const room = await prisma.room.update({
      where: { roomId },
      data,
      select: { roomId: true, name: true, isActive: true },
    });
    return res.status(200).json({ success: true, data: room });
  } catch (err) { return next(err); }
});

// ─── GET /api/rooms/operating-hours ──────────────────────────────────────────
router.get('/operating-hours', authGuard, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hours = await prisma.clinicOperatingHour.findMany({
      orderBy: { weekday: 'asc' },
    });

    // Format time fields
    const formatted = hours.map(h => ({
      weekday: h.weekday,
      openTime: h.openTime ? new Date(h.openTime).toISOString().slice(11, 19) : null,
      closeTime: h.closeTime ? new Date(h.closeTime).toISOString().slice(11, 19) : null,
      lunchStart: h.lunchStart ? new Date(h.lunchStart).toISOString().slice(11, 19) : null,
      lunchEnd: h.lunchEnd ? new Date(h.lunchEnd).toISOString().slice(11, 19) : null,
      isClosed: h.isClosed,
    }));

    return res.status(200).json({ success: true, data: formatted });
  } catch (err) { return next(err); }
});

// ─── PATCH /api/rooms/operating-hours/:weekday ────────────────────────────────
router.patch('/operating-hours/:weekday', authGuard, requireRole('manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const weekday = parseInt(req.params.weekday);
    if (isNaN(weekday) || weekday < 0 || weekday > 6) {
      throw new AppError(400, 'Ngày trong tuần không hợp lệ (0-6).', 'VALIDATION_ERROR');
    }

    const { openTime, closeTime, lunchStart, lunchEnd, isClosed } = req.body;

    const parseTime = (t: string | null): Date | undefined => {
      if (!t) return undefined;
      // Convert HH:MM or HH:MM:SS to Date for Time field
      const [h, m, s] = t.split(':').map(Number);
      const d = new Date(1970, 0, 1, h, m, s || 0);
      return d;
    };

    const data: any = {};
    if (openTime !== undefined) data.openTime = parseTime(openTime);
    if (closeTime !== undefined) data.closeTime = parseTime(closeTime);
    if (lunchStart !== undefined) data.lunchStart = lunchStart ? parseTime(lunchStart) : null;
    if (lunchEnd !== undefined) data.lunchEnd = lunchEnd ? parseTime(lunchEnd) : null;
    if (isClosed !== undefined) data.isClosed = Boolean(isClosed);

    const updated = await prisma.clinicOperatingHour.update({
      where: { weekday },
      data,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err) { return next(err); }
});

export default router;
