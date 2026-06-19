import { Router } from 'express';
import * as ctrl from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect, authorize('admin'));

router.get('/revenue', ctrl.revenueReport);
router.get('/pending-rent', ctrl.pendingRentReport);
router.get('/occupancy', ctrl.occupancyReport);
router.get('/complaints', ctrl.complaintReport);
router.get('/staff-tasks', ctrl.staffTaskReport);

export default router;
