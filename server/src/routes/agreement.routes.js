import { Router } from 'express';
import * as ctrl from '../controllers/agreement.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/me', authorize('tenant'), ctrl.myAgreement);
router.get('/', authorize('admin'), ctrl.listAgreements);
router.post('/', authorize('admin'), ctrl.createAgreement);
router.put('/:id/sign', authorize('tenant'), ctrl.signAgreement);
router.get('/:id/pdf', authorize('admin', 'tenant'), ctrl.getAgreementPdf);
router.delete('/:id', authorize('admin'), ctrl.deleteAgreement);

export default router;
