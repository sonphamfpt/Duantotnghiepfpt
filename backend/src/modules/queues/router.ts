import { Router } from 'express';
import * as queuesController from './controller';

const router = Router();

router.get('/', queuesController.getActiveTicketsHandler);
router.post('/checkin', queuesController.checkInPatientHandler);
router.put('/:id/status', queuesController.updateTicketStatusHandler);

export default router;
