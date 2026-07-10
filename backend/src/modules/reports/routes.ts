import { Router } from 'express';
import { reportsController } from './controller';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';

const router = Router();

// GET /api/reports/dashboard — Chỉ Quản lý mới được xem báo cáo
router.get('/dashboard', authGuard, requireRole('manager'), reportsController.getDashboard);

export default router;
