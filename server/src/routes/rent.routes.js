import { Router } from 'express';
import * as ctrl from '../controllers/rent.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.post('/generate', authorize('admin'), ctrl.generateRents);
router.post('/electricity', authorize('admin'), ctrl.applyElectricity);
router.post('/send-reminders', authorize('admin'), ctrl.sendReminders);
router.post('/:id/remind', authorize('admin'), ctrl.remindRent);
router.get('/', ctrl.listRents);
router.get('/:id', ctrl.getRent);
router.put('/:id', authorize('admin'), ctrl.updateRent);
router.put('/:id/mark-paid', authorize('admin'), ctrl.markPaid);
router.post('/:id/pay', authorize('tenant'), ctrl.initiatePayment);
router.get('/:id/upi', authorize('tenant'), ctrl.getUpiIntent);
router.post('/:id/verify', authorize('tenant'), ctrl.verifyPayment);
router.get('/:id/receipt', ctrl.getReceipt);

export default router;
