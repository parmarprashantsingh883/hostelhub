import { Router } from 'express';
import * as ctrl from '../controllers/staff.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin'), ctrl.listStaff);
router.get('/permissions', authorize('admin'), ctrl.permissionCatalog);
router.post('/', authorize('admin'), ctrl.createStaff);
router.get('/:id', ctrl.getStaff);
router.put('/:id', authorize('admin'), ctrl.updateStaff);
router.put('/:id/permissions', authorize('admin'), ctrl.updatePermissions);
router.delete('/:id', authorize('admin'), ctrl.deactivateStaff);
router.get('/:id/tasks', ctrl.staffTasks);

export default router;
