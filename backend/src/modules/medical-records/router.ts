import { Router } from 'express';
import * as medicalRecordsController from './controller';

const router = Router();

router.get('/patients/:patientId', medicalRecordsController.getPatientRecordsHandler);
router.post('/', medicalRecordsController.createRecordHandler);

export default router;
