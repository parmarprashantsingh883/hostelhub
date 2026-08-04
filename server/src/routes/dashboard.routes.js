import { Router } from 'express';
import * as ctrl from '../controllers/dashboard.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/admin', authorize('admin'), ctrl.adminDashboard);
router.get('/tenant', authorize('tenant'), ctrl.tenantDashboard);
router.get('/staff', authorize('staff'), ctrl.staffDashboard);
router.get('/onboarding', authorize('admin'), ctrl.onboarding);
router.post('/onboarding/dismiss', authorize('admin'), ctrl.dismissOnboarding);
router.get('/activity', authorize('admin'), ctrl.activity);

export default router;
