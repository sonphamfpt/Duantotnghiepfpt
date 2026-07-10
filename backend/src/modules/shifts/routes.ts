import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.getShiftsHandler);
router.post('/', controller.createShiftHandler);
router.post('/swap', controller.swapShiftsHandler);
router.post('/transfer', controller.transferShiftHandler);
router.get('/notifications', controller.getShiftNotificationsHandler);
router.post('/notifications/:notifId/resolve-item/:appointmentId', controller.resolveConflictItemHandler);

export default router;
