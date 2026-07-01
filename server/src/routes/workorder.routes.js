import { Router } from 'express';
import * as ctrl from '../controllers/workorder.controller.js';
import { protect, authorize, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listWorkOrders);
router.post('/', authorize('admin', 'staff'), requirePermission('maintenance.manage'), ctrl.createWorkOrder);
router.put('/:id', authorize('admin', 'staff'), requirePermission('maintenance.manage'), ctrl.updateWorkOrder);
router.put('/:id/status', authorize('admin', 'staff'), requirePermission('maintenance.manage'), ctrl.updateWorkOrderStatus);
router.delete('/:id', authorize('admin'), ctrl.deleteWorkOrder);

export default router;
