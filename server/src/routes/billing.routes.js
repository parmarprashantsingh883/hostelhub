import { Router } from 'express';
import * as ctrl from '../controllers/billing.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/plans', ctrl.listPlans); // public — the pricing page reads this

router.use(protect, authorize('admin'));
router.get('/', ctrl.summary);
router.post('/checkout', ctrl.checkout);
router.post('/activate', ctrl.activate);
router.post('/cancel', ctrl.cancel);

export default router;
