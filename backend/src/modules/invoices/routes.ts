import { Router } from 'express';
import * as controller from './controller';

const router = Router();

router.get('/', controller.getInvoicesHandler);
router.get('/:id', controller.getInvoiceByIdHandler);
router.post('/:id/pay', controller.payInvoiceHandler);
router.post('/patients/:patientId/recharge', controller.rechargeWalletHandler);
router.get('/patients/:patientId/billing', controller.getPatientBillingHandler);

export default router;
