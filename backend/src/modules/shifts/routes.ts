import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.getShiftsHandler);
router.post('/', controller.createShiftHandler);
router.post('/swap', controller.swapShiftsHandler);
router.post('/transfer', controller.transferShiftHandler);
router.get('/notifications', controller.getShiftNotificationsHandler);
router.post('/notifications/:notifId/resolve-item/:appointmentId', controller.resolveConflictItemHandler);
router.patch('/:shiftId/room', controller.updateShiftRoomHandler);
router.delete('/:shiftId', controller.deleteShiftHandler);

export default router;
