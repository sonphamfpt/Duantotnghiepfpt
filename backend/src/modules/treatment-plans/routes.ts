import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.getTreatmentPlansHandler);
router.get('/:id', controller.getTreatmentPlanByIdHandler);
router.post('/', controller.createTreatmentPlanHandler);
router.patch('/:id/status', controller.updatePlanStatusHandler);
router.get('/patients/:patientId', controller.getPatientPlansHandler);

export default router;
