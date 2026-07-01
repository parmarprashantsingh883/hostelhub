import { Router } from 'express';
import * as ctrl from '../controllers/visitor.controller.js';
import { protect, authorize, requirePermission } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.post('/', authorize('tenant'), ctrl.createVisitor);
router.post('/check-in-by-code', authorize('admin', 'staff'), requirePermission('visitors.manage'), ctrl.checkInByCode);
router.get('/', ctrl.listVisitors);
router.get('/:id', ctrl.getVisitor);
router.put('/:id/check-in', authorize('admin', 'staff'), requirePermission('visitors.manage'), ctrl.checkIn);
router.put('/:id/check-out', authorize('admin', 'staff'), requirePermission('visitors.manage'), ctrl.checkOut);
router.put('/:id/reject', authorize('admin', 'staff'), requirePermission('visitors.manage'), ctrl.reject);

export default router;
