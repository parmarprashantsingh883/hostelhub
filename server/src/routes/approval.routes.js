import { Router } from 'express';
import * as ctrl from '../controllers/approval.controller.js';
import { protect, authorize, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listApprovals);
router.post('/', authorize('admin', 'staff'), requirePermission('approvals.raise'), ctrl.createApproval);
router.put('/:id/decision', authorize('admin'), ctrl.decideApproval);
router.delete('/:id', authorize('admin', 'staff'), ctrl.deleteApproval);

export default router;
