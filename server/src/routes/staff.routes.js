import { Router } from 'express';
import * as ctrl from '../controllers/staff.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin'), ctrl.listStaff);
router.post('/', authorize('admin'), ctrl.createStaff);
router.get('/:id', ctrl.getStaff);
router.put('/:id', authorize('admin'), ctrl.updateStaff);
router.delete('/:id', authorize('admin'), ctrl.deactivateStaff);
router.get('/:id/tasks', ctrl.staffTasks);

export default router;
