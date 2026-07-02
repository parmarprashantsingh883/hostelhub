import { Router } from 'express';
import * as ctrl from '../controllers/tenant.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';
import { enforceLimit } from '../middleware/subscription.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listTenants);
router.post('/', authorize('admin'), enforceLimit('residents'), ctrl.createTenant);
router.get('/:id', ctrl.getTenant);
router.put('/:id', authorize('admin'), ctrl.updateTenant);
router.delete('/:id', authorize('admin'), ctrl.deactivateTenant);
router.get('/:id/rent', ctrl.tenantRents);
router.get('/:id/complaints', ctrl.tenantComplaints);

export default router;
