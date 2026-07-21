import { Router } from 'express';
import * as controller from './controller';
import { authGuard } from '../../middlewares/authGuard';
import { requireRole } from '../../middlewares/roleGuard';

const router = Router();

router.get('/', controller.getPublicReviewsHandler);
router.post('/', controller.createReviewHandler);

router.get('/manage', authGuard, requireRole('manager'), controller.getManageReviewsHandler);
router.patch('/:id/status', authGuard, requireRole('manager'), controller.updateReviewStatusHandler);
router.post('/:id/ai-reply', authGuard, requireRole('manager'), controller.reGenerateAIReplyHandler);

export default router;
