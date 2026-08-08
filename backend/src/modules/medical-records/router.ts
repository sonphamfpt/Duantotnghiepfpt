import { Router } from 'express';
import * as medicalRecordsController from './controller';

const router = Router();

router.get('/', medicalRecordsController.getAllRecordsHandler);
router.get('/patients/:patientId', medicalRecordsController.getPatientRecordsHandler);
router.post('/', medicalRecordsController.createRecordHandler);


export default router;
