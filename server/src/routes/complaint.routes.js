import { Router } from 'express';
import * as ctrl from '../controllers/complaint.controller.js';
import { protect, authorize, requirePermission } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();
router.use(protect);

router.post('/', authorize('tenant'), upload.array('images', 3), ctrl.createComplaint);
router.get('/', ctrl.listComplaints);
router.get('/:id', ctrl.getComplaint);
router.put('/:id', authorize('admin'), ctrl.updateComplaint);
router.put('/:id/assign', authorize('admin'), ctrl.assignComplaint);
router.put('/:id/status', authorize('admin', 'staff'), requirePermission('complaints.manage'), ctrl.updateStatus);
router.post('/:id/feedback', authorize('tenant'), ctrl.addFeedback);

export default router;
