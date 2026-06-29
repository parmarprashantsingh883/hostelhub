import { Router } from 'express';
import * as ctrl from '../controllers/inspection.controller.js';
import { protect, authorize } from '../middleware/auth.middleware.js';

const router = Router();
router.use(protect);

router.get('/', authorize('admin', 'staff'), ctrl.listInspections);
router.get('/:id', authorize('admin', 'staff'), ctrl.getInspection);
router.post('/', authorize('admin', 'staff'), ctrl.createInspection);
router.put('/:id', authorize('admin', 'staff'), ctrl.updateInspection);
router.put('/:id/complete', authorize('admin', 'staff'), ctrl.completeInspection);
router.delete('/:id', authorize('admin'), ctrl.deleteInspection);

export default router;
